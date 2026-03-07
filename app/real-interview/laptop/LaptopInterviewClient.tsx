// @ts-nocheck
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, MicOff, Settings, Bot, ArrowRight, BookUser, ArrowLeft, 
  Loader2, FileText, Building, Briefcase, Trash2, Copy, CheckCircle2,
  UploadCloud, Info, Clock, Zap, Activity as ActivityIcon
} from "lucide-react";
import { AudioVisualizer } from "react-audio-visualize";

export default function LaptopInterviewClient() {
  const [view, setView] = useState<'setup' | 'interview'>('setup');
  const [config, setConfig] = useState({ resume: "", jobDescription: "", companyName: "", role: "" });

  return (
    <div className="min-h-screen w-full bg-[#020205] text-slate-200 antialiased font-sans selection:bg-blue-500/30">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
        .font-pro-sans { font-family: 'Inter', sans-serif; }
        .font-pro-mono { font-family: 'JetBrains Mono', monospace; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.5); }
      `}</style>
      
      <AnimatePresence mode="wait">
        {view === 'setup' ? (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SetupView onStart={(c) => { setConfig(c); setView('interview'); }} />
          </motion.div>
        ) : (
          <motion.div key="interview" className="h-screen flex flex-col overflow-hidden" initial={{ opacity: 0, scale: 1.01 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <InterviewDashboard config={config} onBack={() => setView('setup')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- PROFESSIONAL SETUP VIEW ---
function SetupView({ onStart }) {
  const [localConfig, setLocalConfig] = useState({ resume: "", jobDescription: "", companyName: "", role: "" });
  const [micStatus, setMicStatus] = useState("SIGNAL: STANDBY");
  const [isTesting, setIsTesting] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const sttClient = useRef(null);

  const handleTestMic = useCallback(() => {
    if (isTesting) {
      sttClient.current?.stop();
      recorder?.stop();
      setRecorder(null);
      setIsTesting(false);
      setMicStatus("SIGNAL: TERMINATED");
    } else {
      setIsTesting(true);
      sttClient.current = new SpeechmaticsClient();
      sttClient.current.start({
        language: "en",
        onStatus: setMicStatus,
        onPartial: () => setMicStatus("SIGNAL: RECEIVING"),
        onFinal: () => setMicStatus("SIGNAL: STABLE"),
        onError: (err) => { setMicStatus(`ERROR: ${err}`); setIsTesting(false); },
      });
    }
  }, [isTesting, recorder]);

  useEffect(() => {
    let interval;
    if (isTesting && sttClient.current && !recorder) {
      interval = setInterval(() => {
        const stream = sttClient.current?.stream;
        if (stream) {
          const rec = new MediaRecorder(stream);
          rec.start();
          setRecorder(rec);
          clearInterval(interval);
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isTesting, recorder]);

  return (
    <div className="max-w-6xl mx-auto py-16 px-8 font-pro-sans">
      <div className="flex items-end justify-between mb-12 border-b border-white/5 pb-8">
        <div>
          <span className="text-blue-500 font-pro-mono font-bold tracking-[0.4em] text-[10px]">v2.1 PRO EDITION</span>
          <h1 className="text-5xl font-black tracking-tighter text-white mt-1">DASHBOARD<span className="text-slate-800">_</span>INIT</h1>
        </div>
        <button onClick={() => onStart(localConfig)} className="px-10 py-4 bg-white text-black font-black rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-300 flex items-center gap-3 tracking-widest text-[11px] shadow-2xl">
          INITIALIZE <ArrowRight size={16}/>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Target Parameters</h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <input value={localConfig.companyName} onChange={e => setLocalConfig({...localConfig, companyName: e.target.value})} placeholder="COMPANY" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700" />
              <input value={localConfig.role} onChange={e => setLocalConfig({...localConfig, role: e.target.value})} placeholder="ROLE TITLE" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700" />
            </div>
            <textarea value={localConfig.jobDescription} onChange={e => setLocalConfig({...localConfig, jobDescription: e.target.value})} placeholder="PASTE JOB DESCRIPTION..." className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-4 text-xs text-slate-400 outline-none resize-none focus:border-blue-500/50" />
          </div>
          
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Career Source Data</h2>
              <label className="text-[9px] font-black text-white cursor-pointer flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-all">
                IMPORT TXT <UploadCloud size={12} className="text-blue-500"/>
                <input type="file" className="hidden" accept=".txt" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if(file) {
                    const reader = new FileReader();
                    reader.onload = (p) => setLocalConfig({...localConfig, resume: p.target.result});
                    reader.readAsText(file);
                  }
                }} />
              </label>
            </div>
            <textarea value={localConfig.resume} onChange={e => setLocalConfig({...localConfig, resume: e.target.value})} placeholder="PASTE FULL RESUME TEXT..." className="w-full h-72 bg-black/40 border border-white/10 rounded-lg p-6 text-slate-300 font-pro-mono text-[11px] leading-relaxed outline-none" />
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 h-fit sticky top-10 flex flex-col items-center">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8">Hardware Sync</h2>
          <div className="w-full bg-black/60 p-6 rounded-2xl border border-white/5 mb-6">
            <div className="text-[9px] font-pro-mono font-bold text-blue-500 mb-4 tracking-widest text-center">{micStatus}</div>
            <button onClick={handleTestMic} className={`w-full py-4 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all duration-500 ${isTesting ? 'bg-red-600/10 text-red-500 border border-red-500/20' : 'bg-white text-black hover:bg-blue-600 hover:text-white'}`}>
              {isTesting ? "STOP CALIBRATION" : "TEST AUDIO"}
            </button>
          </div>
          <div className="h-20 w-full flex items-center justify-center bg-black/40 rounded-xl overflow-hidden border border-white/5">
            {isTesting && recorder ? <AudioVisualizer mediaRecorder={recorder} width={300} height={40} barColor="#3b82f6" barWidth={3} gap={2} /> : <Zap size={18} className="text-slate-800" />}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- INTERVIEW DASHBOARD ---
function InterviewDashboard({ config, onBack }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [answer, setAnswer] = useState("");
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "interviewer" | "candidate"; text: string }>
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [sessionTime, setSessionTime] = useState(0);
  const sttClient = useRef(null);

  useEffect(() => {
    let timer;
    if (isRecording) timer = setInterval(() => setSessionTime(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const stopMic = useCallback(() => {
    if (sttClient.current) {
      sttClient.current.stop();
      if (recorder && recorder.state !== "inactive") recorder.stop();
      setRecorder(null);
      setIsRecording(false);
    }
  }, [recorder]);

  const generateAnswer = async () => {
    const fullText = (transcript + " " + partial).trim();
    if (!fullText || isGenerating) return;
    const nextHistory = [...conversationHistory, { role: "interviewer" as const, text: fullText }];
    
    // 1. Mute Mic immediately
    stopMic();
    
    // 2. Start loading state
    setIsGenerating(true);
    setAnswer(""); 
    setConversationHistory(nextHistory);

    try {
      const response = await fetch("/api/stt/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transcript: fullText, 
          resume: config.resume, 
          jd: config.jobDescription,
          conversationHistory: nextHistory,
          context: `
            Role: ${config.role}
            Company: ${config.companyName}
            INSTRUCTION: Use EXACT facts, years of experience, and numbers from the resume. 
            If the resume says 3 years, say "I have 3 years of experience". 
            Do NOT use generic corporate fluff. Be specific and concise.
          ` 
        }),
      });

      if (!response.ok) throw new Error("API Route Failed");

      const data = await response.json();
      const nextAnswer = data.answer || "No response generated.";
      setAnswer(nextAnswer);
      if (data.answer) {
        setConversationHistory([...nextHistory, { role: "candidate", text: data.answer }]);
      }
    } catch (err) { 
      console.error("Answer generation error:", err);
      setAnswer("ERROR: AI LINK SEVERED. Check console for POST errors."); 
    } finally { 
      // 3. THIS PREVENTS STUCK LOADING
      setIsGenerating(false); 
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => { 
      if (e.code === "Space") { 
        e.preventDefault(); 
        generateAnswer(); 
      } 
      if (e.code === "Escape") { 
        e.preventDefault(); 
        setTranscript(""); setPartial(""); setAnswer(""); 
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [transcript, partial, isGenerating]);

  const toggleMic = useCallback(() => {
    if (isRecording) {
      stopMic();
    } else {
      setIsRecording(true);
      setTranscript(""); setPartial(""); setAnswer(""); setSessionTime(0);
      sttClient.current = new SpeechmaticsClient();
      sttClient.current.start({
        language: "en",
        onStatus: () => {},
        onPartial: (text) => setPartial(text),
        onFinal: (text) => { setTranscript(p => (p + " " + text).trim()); setPartial(""); },
        onError: () => setIsRecording(false),
      });
    }
  }, [isRecording, stopMic]);

  useEffect(() => {
    let interval;
    if (isRecording && sttClient.current && !recorder) {
      interval = setInterval(() => {
        const stream = sttClient.current?.stream;
        if (stream) {
          const rec = new MediaRecorder(stream);
          rec.start();
          setRecorder(rec);
          clearInterval(interval);
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isRecording, recorder]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getAnswerFontSize = (text) => {
    if (text.length > 500) return 'text-lg';
    if (text.length > 250) return 'text-xl';
    return 'text-2xl';
  };

  return (
    <div className="h-screen flex flex-col bg-[#020205] font-pro-sans">
      <nav className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-2xl z-50">
        <div className="flex items-center gap-6">
          <button onClick={() => { if(isRecording) stopMic(); onBack(); }} className="text-slate-600 hover:text-white transition-all"><ArrowLeft size={16}/></button>
          <div className="flex items-center gap-3">
            <div className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] border-r border-white/10 pr-3">LIVE SESSION</div>
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">{config.role || 'ROLE_UNSET'} @ {config.companyName || 'PRO'}</div>
          </div>
        </div>
        <div className="flex items-center gap-8">
           <div className="flex items-center gap-4">
              <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">T+</div>
              <div className="text-lg font-black text-white font-pro-mono leading-none">{formatTime(sessionTime)}</div>
           </div>
           <div className="h-7 w-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-[10px]">IQ</div>
        </div>
      </nav>

      <div className="h-16 bg-blue-600/[0.02] border-b border-white/5 flex items-center justify-center px-12 relative overflow-hidden">
         <div className="max-w-6xl w-full flex items-center justify-center text-center">
            <p className="text-lg font-semibold text-white tracking-tight leading-none overflow-hidden truncate">
              <span className="opacity-10 uppercase text-[9px] font-black tracking-[0.4em] mr-4">Signal:</span>
              <span className="opacity-30">{transcript.slice(-80)}</span>
              <span className="text-blue-500"> {partial}</span>
              {!transcript && !partial && <span className="text-slate-800 italic uppercase text-xs tracking-[0.2em] font-black">Awaiting Voice Input...</span>}
            </p>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-white/5 bg-black/20 p-6 overflow-y-auto custom-scrollbar hidden xl:block">
          <h4 className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] mb-6 italic">Background Context</h4>
          <div className="text-[10px] text-slate-500 leading-relaxed font-medium whitespace-pre-wrap">{config.resume || 'EMPTY'}</div>
        </aside>

        <main className="flex-1 flex flex-col items-center justify-center p-12 bg-[radial-gradient(circle_at_center,_#0a0a1a_0%,_transparent_85%)]">
          <div className="w-full max-w-4xl bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-3xl shadow-2xl relative">
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 text-purple-500 text-[9px] font-black uppercase tracking-[0.4em]">
               <Bot size={14} className="animate-pulse"/> Recommended Response
            </div>
            <div className="min-h-[250px] max-h-[400px] overflow-y-auto custom-scrollbar flex items-center justify-center px-4 mt-4">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-6">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                  <span className="text-[9px] font-black text-slate-600 tracking-[0.4em] uppercase">Synthesizing Logic</span>
                </div>
              ) : (
                <p className={`${getAnswerFontSize(answer)} font-semibold text-white leading-relaxed text-center italic transition-all duration-500`}>
                  {answer || <span className="text-slate-800 not-italic uppercase tracking-[0.2em] text-[10px] font-black">Tap <span className="text-blue-500">SPACEBAR</span> to analyze question</span>}
                </p>
              )}
            </div>
            {answer && (
              <button onClick={() => navigator.clipboard.writeText(answer)} className="absolute bottom-6 right-8 p-3 bg-white/5 hover:bg-blue-600 hover:text-white rounded-xl transition-all text-slate-600 border border-white/5">
                <Copy size={16}/>
              </button>
            )}
          </div>
        </main>

        <aside className="w-64 border-l border-white/5 bg-black/20 p-6 flex flex-col justify-between hidden xl:flex">
          <div className="space-y-10">
            <h4 className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] italic">Telemetry</h4>
            <div className="space-y-8">
               <div>
                  <div className="text-[9px] font-bold text-blue-500/50 uppercase tracking-widest mb-1">Words Cap</div>
                  <div className="text-3xl font-black text-white font-pro-mono tracking-tighter">{transcript.split(' ').length}</div>
               </div>
               <div>
                  <div className="text-[9px] font-bold text-blue-500/50 uppercase tracking-widest mb-1">Clarity</div>
                  <div className="flex gap-1 mt-1">
                    {[1,2,3,4,5].map(i => <div key={i} className={`h-4 w-1 rounded-full ${isRecording ? 'bg-blue-500' : 'bg-slate-900'}`} />)}
                  </div>
               </div>
            </div>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
             <div className="flex justify-between text-[9px] font-bold uppercase"><span className="text-slate-600">SPACE</span> <span className="text-slate-300">GET_ANS</span></div>
             <div className="flex justify-between text-[9px] font-bold uppercase"><span className="text-slate-600">ESC</span> <span className="text-slate-300">WIPE</span></div>
          </div>
        </aside>
      </div>

      <footer className="h-24 bg-black border-t border-white/5 flex items-center justify-between px-16 relative z-50">
        <div className="flex-1 flex items-center justify-center">
           <div className="w-full max-w-3xl h-12 bg-white/[0.01] rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 opacity-40 flex items-center justify-center">
                 {isRecording && recorder && <AudioVisualizer mediaRecorder={recorder} width={1000} height={50} barColor="#3b82f6" barWidth={4} gap={3} />}
              </div>
              {!isRecording && <span className="text-[9px] font-black text-slate-800 uppercase tracking-[0.6em] z-10">CORE_MIC_OFFLINE</span>}
           </div>
        </div>
        <div className="ml-12">
          <button onClick={toggleMic} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${isRecording ? 'bg-red-600 scale-105' : 'bg-blue-600'}`}>
            {isRecording ? <MicOff size={32} className="text-white"/> : <Mic size={32} className="text-white"/>}
          </button>
        </div>
      </footer>
    </div>
  );
}

// --- STT CLIENT CLASS ---
export class SpeechmaticsClient {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  public stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private started = false;

  async start(opts: any) {
    if (this.started) return;
    this.started = true;
    try {
      const tr = await fetch("/api/stt/tokens", { cache: "no-store" });
      const data = await tr.json();
      const wsUrl = `wss://eu2.rt.speechmatics.com/v2/en?jwt=${data.token}`;
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = "arraybuffer";
      this.ws.onopen = async () => this.setupAudio(opts);
      this.ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.message === "AddTranscript") opts.onFinal(msg.metadata.transcript);
        else if (msg.message === "AddPartialTranscript") opts.onPartial(msg.metadata.transcript);
      };
      this.ws.onclose = () => this.stop();
      this.ws.onerror = (e) => opts.onError(e);
    } catch (err) { opts.onError(err); }
  }

  private async setupAudio(opts: any) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      
      const startMsg = {
        message: "StartRecognition",
        audio_format: { type: "raw", encoding: "pcm_f32le", sample_rate: this.audioCtx.sampleRate },
        transcription_config: { language: "en", operating_point: "enhanced", enable_partials: true }
      };
      this.ws?.send(JSON.stringify(startMsg));

      source.connect(this.processor);
      this.processor.connect(this.audioCtx.destination);
      this.processor.onaudioprocess = (e) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(e.inputBuffer.getChannelData(0).buffer);
        }
      };
    } catch (e) {
      opts.onError(e);
      this.stop();
    }
  }

  stop() {
    this.started = false;
    this.processor?.disconnect();
    this.audioCtx?.close();
    this.stream?.getTracks().forEach(t => t.stop());
    this.ws?.close();
    this.processor = null;
    this.audioCtx = null;
    this.stream = null;
    this.ws = null;
  }
}
