type StartOptions = {
  language: string;
  onStatus: (s: string) => void;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (err: string) => void;
};

const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch && ch.length > 0) this.port.postMessage(ch);
    return true;
  }
}
registerProcessor("pcm-processor", PCMProcessor);
`;

export class SpeechmaticsClient {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  public stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private started = false;

  async start(opts: StartOptions) {
    if (this.started) return;
    this.started = true;

    try {
      opts.onStatus("Requesting Token...");

      const tr = await fetch("/api/stt/tokens", { cache: "no-store" });

      if (!tr.ok) {
        throw new Error(`API Error (${tr.status})`);
      }

      const data = await tr.json();

      if (!data.token) {
        throw new Error("No token received");
      }

      const wsUrl = `wss://eu.rt.speechmatics.com/v2/en?jwt=${data.token}`;

      opts.onStatus("Connecting...");

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = async () => {
        opts.onStatus("Connected. Starting Mic...");
        await this.setupAudio(opts);
      };

      this.ws.onmessage = (evt) => {
        this.handleMessage(evt, opts);
      };

      this.ws.onerror = (e) => {
        console.error("WS Error:", e);
        opts.onError("WebSocket Connection Error");
      };

      this.ws.onclose = (e) => {
        if (this.started) {
          opts.onStatus(`Connection Closed (Code: ${e.code})`);
        }
        this.stop();
      };

    } catch (err: any) {
      this.started = false;
      opts.onError(err.message || "Failed to start");
    }
  }

  private async setupAudio(opts: StartOptions) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          // @ts-ignore
          latency: 0,
          sampleRate: 16000,
        },
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

      this.audioCtx = new AudioContextClass({
        latencyHint: "interactive",
        sampleRate: 16000,
      });

      await this.audioCtx.resume();

      const startMsg = {
        message: "StartRecognition",
        audio_format: {
          type: "raw",
          encoding: "pcm_f32le",
          sample_rate: this.audioCtx.sampleRate,
        },
        transcription_config: {
          language: "en",
          // switched back to enhanced for maximum accuracy
          // standard was mishearing "Wipro" as "in vitro" etc.
          operating_point: "enhanced",
          enable_partials: true,
          max_delay: 0.7,
          enable_entities: true,
          // Custom vocabulary — teaches Speechmatics your specific words
          // so it stops mishearing company names and tech terms
          additional_vocab: [
            { content: "Wipro", sounds_like: ["wee-pro", "wipro"] },
            { content: "Hexaware", sounds_like: ["hex-a-ware", "hexaware"] },
            { content: "Infosys", sounds_like: ["info-sis", "infosys"] },
            { content: "Renasant", sounds_like: ["ren-a-sant", "renasant"] },
            { content: "PostgreSQL", sounds_like: ["post-gres", "postgres", "postgres sequel"] },
            { content: "Spring Boot", sounds_like: ["spring boot"] },
            { content: "Microservices", sounds_like: ["micro-services", "microservices"] },
            { content: "API", sounds_like: ["a-p-i", "api"] },
            { content: "CI/CD", sounds_like: ["c-i-c-d", "ci cd"] },
            { content: "GitHub", sounds_like: ["git-hub", "github"] },
          ],
        },
      };

      this.ws?.send(JSON.stringify(startMsg));

      const source = this.audioCtx.createMediaStreamSource(this.stream);

      try {
        const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        await this.audioCtx.audioWorklet.addModule(blobUrl);
        URL.revokeObjectURL(blobUrl);

        this.workletNode = new AudioWorkletNode(this.audioCtx, "pcm-processor");

        this.workletNode.port.onmessage = (e) => {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
          this.ws.send(e.data.buffer);
        };

        source.connect(this.workletNode);
        this.workletNode.connect(this.audioCtx.destination);

        opts.onStatus("Listening...");

      } catch (workletErr) {
        console.warn("AudioWorklet unavailable, falling back to ScriptProcessor:", workletErr);

        const processor = this.audioCtx.createScriptProcessor(256, 1, 1);
        source.connect(processor);
        processor.connect(this.audioCtx.destination);

        processor.onaudioprocess = (e) => {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
          this.ws.send(e.inputBuffer.getChannelData(0).buffer);
        };

        opts.onStatus("Listening (fallback)...");
      }

    } catch (err) {
      opts.onError("Microphone Denied");
      this.stop();
    }
  }

  private handleMessage(evt: MessageEvent, opts: StartOptions) {
    try {
      const msg = JSON.parse(evt.data);

      if (msg.message === "AudioAdded") return;

      if (msg.message === "AddTranscript") {
        if (msg.metadata?.transcript) {
          opts.onFinal(msg.metadata.transcript);
        }
      } else if (msg.message === "AddPartialTranscript") {
        if (msg.metadata?.transcript) {
          opts.onPartial(msg.metadata.transcript);
        }
      }
    } catch {}
  }

  stop() {
    this.started = false;
    this.workletNode?.disconnect();
    this.audioCtx?.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ws?.close();

    this.workletNode = null;
    this.audioCtx = null;
    this.stream = null;
    this.ws = null;
  }
}