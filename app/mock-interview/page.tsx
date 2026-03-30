"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebaseConfig";
import AiRobot3D from "../../components/AiRobot3D";
import {
  Mic, MicOff, Camera, CameraOff, Play, Square, SkipForward,
  FileText, Briefcase, Search, Loader2, CheckCircle2, XCircle,
  ChevronRight, Zap, RotateCcw, Volume2, VolumeX,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
type Feedback = {
  score: number;
  strengths: string[];
  improvements: string[];
  betterAnswerExample: string;
  resume_proof?: string;
};

type InterviewTurn = {
  role: "interviewer" | "candidate";
  text: string;
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const getEmail = () => auth.currentUser?.email || "";

const renderSafe = (val: any): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    if (typeof val.summary === "string") return val.summary;
    try { return JSON.stringify(val); } catch { return String(val); }
  }
  return String(val);
};

async function fetchAi(payload: any) {
  const res = await fetch("/api/stt/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, userEmail: getEmail() }),
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (res.status === 402 || data.error === "insufficient_credits") {
      window.location.href = "/pricing";
      throw new Error("insufficient_credits");
    }
    return data;
  } catch (e: any) {
    if (e.message === "insufficient_credits") throw e;
    throw new Error("API error");
  }
}

const normalizeQuestions = (res: any): string[] => {
  const raw = res?.questions || res?.data?.questions || res?.result?.questions || [];
  return Array.isArray(raw) ? raw.map((x: any) => String(x || "").trim()).filter(Boolean) : [];
};

const shuffle = (arr: string[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function MockInterviewPage() {
  // ── PHASE: "setup" | "ready" | "interview" | "summary" ──
  const [phase, setPhase] = useState<"setup" | "ready" | "interview" | "summary">("setup");

  // Setup
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState("");

  // Questions
  const [questions, setQuestions] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  // Interview state
  const [answer, setAnswer] = useState("");
  const [partial, setPartial] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [history, setHistory] = useState<InterviewTurn[]>([]);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Camera
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Speechmatics refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const smStartedRef = useRef(false);
  const answerRef = useRef("");

  // ── FIX: Use refs for isRecording/isAnalyzing to avoid stale closures ──
  const isRecordingRef = useRef(false);
  const isAnalyzingRef = useRef(false);

  // Silence detection
  const silenceTimerRef = useRef<number | null>(null);

  // Current question
  const currentQ = questions[index] || "Tell me about yourself.";
  const totalQ = questions.length || 1;
  const progress = ((index + 1) / totalQ) * 100;

  // Keep refs in sync with state
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { isAnalyzingRef.current = isAnalyzing; }, [isAnalyzing]);

  // ── CAMERA ──
  const toggleCamera = async () => {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setCameraOn(true);
      } catch { setCameraOn(false); }
    }
  };

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  // ── SILENCE TIMER HELPERS (defined before use) ──
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // ── STOP RECORDING ──
  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    smStartedRef.current = false;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message: "EndOfStream" }));
    }
    wsRef.current?.close();
    wsRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;
    isRecordingRef.current = false;
    setIsRecording(false);
    setPartial("");
  }, [clearSilenceTimer]);

  // ── SUBMIT ANSWER (forward declaration needed for silence timer) ──
  const submitAnswerRef = useRef<(finalAns?: string) => Promise<void>>();

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      if (answerRef.current.trim().length > 10) {
        stopRecording();
        submitAnswerRef.current?.(answerRef.current);
      }
    }, 3500);
  }, [clearSilenceTimer, stopRecording]);

  // ── SPEECHMATICS — start recording ──
  const startRecording = useCallback(async () => {
    // Use refs to avoid stale closure bug
    if (isRecordingRef.current || isAnalyzingRef.current) return;
    // Prevent double-call if WebSocket already open
    if (wsRef.current) return;

    try {
      // ── FIX: Use GET request so the API route returns the Speechmatics JWT ──
      const tokenRes = await fetch(
        `/api/stt/tokens?email=${encodeURIComponent(getEmail())}`,
        { method: "GET" }
      );

      if (!tokenRes.ok) {
        console.error("Token request failed with status:", tokenRes.status);
        return;
      }

      const tokenData = await tokenRes.json();
      console.log("Token response:", tokenData);

      // Support both { token: "..." } and { key: "..." } response shapes
      const token = tokenData.token || tokenData.key || tokenData.jwt;

      if (!token) {
        console.error("Critical: No Speechmatics token received. Response was:", tokenData);
        return;
      }

      // 2. Open WebSocket
      const ws = new WebSocket(`wss://eu.rt.speechmatics.com/v2/en?jwt=${token}`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          message: "StartRecognition",
          audio_format: { type: "file" },
          transcription_config: {
            language: "en",
            operating_point: "enhanced",
            enable_partials: true,
          },
        }));
      };

      ws.onmessage = async (e) => {
        if (typeof e.data !== "string") return;
        const msg = JSON.parse(e.data);

        if (msg.message === "RecognitionStarted") {
          smStartedRef.current = true;
          isRecordingRef.current = true;
          setIsRecording(true);

          // 3. Start microphone AFTER WebSocket confirms ready
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = async (ev) => {
              if (
                ev.data.size > 0 &&
                ws.readyState === WebSocket.OPEN &&
                smStartedRef.current
              ) {
                ws.send(await ev.data.arrayBuffer());
              }
            };
            recorder.start(250);
          } catch (micErr) {
            console.error("Microphone access denied:", micErr);
            stopRecording();
          }
        }

        if (msg.message === "AddTranscript" && msg.metadata?.transcript) {
          const text = msg.metadata.transcript;
          answerRef.current = (answerRef.current + " " + text).trim();
          setAnswer(answerRef.current);
          setPartial("");
          resetSilenceTimer();
        }

        if (msg.message === "AddPartialTranscript" && msg.metadata?.transcript) {
          setPartial(msg.metadata.transcript);
          resetSilenceTimer();
        }

        if (msg.message === "Error") {
          console.error("Speechmatics Error:", msg.reason);
          stopRecording();
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket Connection Error:", err);
        stopRecording();
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        isRecordingRef.current = false;
        setIsRecording(false);
        smStartedRef.current = false;
        wsRef.current = null;
      };

    } catch (err) {
      console.error("System Error: Failed to start recording session:", err);
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [stopRecording, resetSilenceTimer]);

  // ── SUBMIT ANSWER ──
  const submitAnswer = useCallback(async (finalAns?: string) => {
    const ans = (finalAns || answerRef.current || "").trim();
    if (ans.length < 5 || isAnalyzingRef.current) return;
    stopRecording();
    window.speechSynthesis.cancel();
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);

    const currentQuestion = questions[index] || "Tell me about yourself.";

    const newHistory: InterviewTurn[] = [
      ...history,
      { role: "interviewer", text: currentQuestion },
      { role: "candidate", text: ans },
    ];
    setHistory(newHistory);

    try {
      const isTooShort = ans.split(/\s+/).length < 5;
      const mode = isTooShort ? "generate_script" : "generate_feedback";

      const res = await fetchAi({
        mode,
        question: currentQuestion,
        answer: ans,
        resume: resumeText,
        jd: jdText,
        conversationHistory: newHistory,
      });

      if (isTooShort) {
        setFeedback({
          score: 0,
          strengths: [],
          improvements: ["Your answer was too short. Try to give 2-3 full sentences with specific examples from your experience."],
          betterAnswerExample: res?.betterAnswerExample || "",
          resume_proof: res?.resume_proof || "",
        });
      } else {
        setFeedback(res);
      }
      setScores(prev => [...prev, res?.score || 0]);
    } catch {
      setFeedback({ score: 0, strengths: [], improvements: ["Error getting feedback"], betterAnswerExample: "", resume_proof: "" });
    }

    isAnalyzingRef.current = false;
    setIsAnalyzing(false);
    setShowFeedback(true);
  }, [stopRecording, questions, index, history, resumeText, jdText]);

  // Keep submitAnswerRef in sync so the silence timer can call the latest version
  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  }, [submitAnswer]);

  // ── TTS — speak question ──
  const speakQuestion = useCallback((text: string) => {
    if (!ttsEnabled) {
      setTimeout(() => startRecording(), 300);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => {
      setIsSpeaking(false);
      setTimeout(() => startRecording(), 800);
    };
    utter.onerror = () => {
      setIsSpeaking(false);
      setTimeout(() => startRecording(), 300);
    };
    window.speechSynthesis.speak(utter);
  }, [ttsEnabled, startRecording]);

  // ── NEXT QUESTION ──
  const nextQuestion = () => {
    const next = index + 1;
    if (next >= questions.length) {
      setPhase("summary");
      return;
    }
    setIndex(next);
    setAnswer("");
    answerRef.current = "";
    setPartial("");
    setFeedback(null);
    setShowFeedback(false);
    setTimeout(() => speakQuestion(questions[next]), 500);
  };

  // ── GENERATE QUESTIONS ──
  const handleGenerate = async () => {
    if (!resumeText) return;
    setIsGenerating(true);
    try {
      const res = await fetchAi({ mode: "generate_questions", resume: resumeText, jd: jdText });
      const qs = normalizeQuestions(res);
      const final = ["Tell me about yourself.", ...shuffle(qs).filter(q => q.toLowerCase() !== "tell me about yourself.")];
      setQuestions(final.slice(0, 20));
      setPhase("ready");
    } catch { alert("Failed to generate questions. Check your credits."); }
    setIsGenerating(false);
  };

  // ── VERIFY RESUME ──
  const handleVerify = async () => {
    if (resumeText.length < 50) return;
    setIsVerifying(true);
    setVerificationResult("");
    try {
      const data = await fetchAi({ mode: "verify_resume", resume: resumeText, jd: jdText || "N/A" });
      setVerificationResult(data?.summary || "No summary returned.");
    } catch { setVerificationResult("Verification failed."); }
    setIsVerifying(false);
  };

  // ── START INTERVIEW ──
  const startInterview = () => {
    setPhase("interview");
    setIndex(0);
    setAnswer("");
    answerRef.current = "";
    setScores([]);
    setHistory([]);
    setFeedback(null);
    setShowFeedback(false);
    setTimeout(() => speakQuestion(questions[0] || "Tell me about yourself."), 500);
  };

  // ── CLEANUP ──
  useEffect(() => {
    return () => {
      stopRecording();
      window.speechSynthesis.cancel();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [stopRecording]);

  // ── FILE UPLOAD ──
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setResumeText(await file.text()); } catch { alert("File read error"); }
  };

  // ── AVERAGE SCORE ──
  const avgScore = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : "0";

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#08080f] text-white" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-50 bg-[#08080f]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-white/90">Mock</span>{" "}
              <span className="text-indigo-400">Interview</span>
            </h1>
            {phase === "interview" && (
              <span className="text-xs text-white/30 font-mono">{index + 1}/{totalQ}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {phase === "interview" && (
              <>
                <button
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  className={`p-2 rounded-lg transition-all ${ttsEnabled ? "bg-indigo-500/20 text-indigo-400" : "bg-white/[0.04] text-white/30"}`}>
                  {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button
                  onClick={toggleCamera}
                  className={`p-2 rounded-lg transition-all ${cameraOn ? "bg-indigo-500/20 text-indigo-400" : "bg-white/[0.04] text-white/30"}`}>
                  {cameraOn ? <Camera size={16} /> : <CameraOff size={16} />}
                </button>
                <button
                  onClick={() => { stopRecording(); window.speechSynthesis.cancel(); setPhase("summary"); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">
                  End
                </button>
              </>
            )}
          </div>
        </div>
        {phase === "interview" && (
          <div className="h-0.5 bg-white/[0.04]">
            <motion.div className="h-full bg-indigo-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6">

        {/* ═══════ SETUP PHASE ═══════ */}
        {phase === "setup" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
            <div className="text-center mb-10 mt-6">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Prepare your interview</h2>
              <p className="text-white/30 text-sm">Paste your resume and job description to generate tailored questions</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Resume */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={16} className="text-indigo-400" />
                  <span className="text-sm font-semibold">Resume</span>
                </div>
                <textarea
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  className="w-full h-56 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-sm text-white/80 placeholder:text-white/15 outline-none focus:border-indigo-500/40 resize-none transition-colors"
                  placeholder="Paste your full resume here..."
                />
                <div className="flex items-center justify-between mt-3">
                  <label className="text-xs text-white/25 hover:text-indigo-400 cursor-pointer transition-colors">
                    <input type="file" onChange={handleFile} className="hidden" accept=".txt,.doc,.docx" />
                    Upload file
                  </label>
                  {resumeText.length > 50 && (
                    <button
                      onClick={handleVerify}
                      disabled={isVerifying}
                      className="flex items-center gap-1.5 text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors">
                      {isVerifying ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                      {isVerifying ? "Verifying..." : "Verify resume"}
                    </button>
                  )}
                </div>
                {verificationResult && (
                  <div className="mt-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs text-emerald-300/70 whitespace-pre-wrap">
                    {verificationResult}
                  </div>
                )}
              </div>

              {/* JD */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase size={16} className="text-purple-400" />
                  <span className="text-sm font-semibold">Job Description</span>
                  <span className="text-[10px] text-white/20 ml-auto">Optional</span>
                </div>
                <textarea
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                  className="w-full h-56 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-sm text-white/80 placeholder:text-white/15 outline-none focus:border-purple-500/40 resize-none transition-colors"
                  placeholder="Paste the job description for targeted questions..."
                />
              </div>
            </div>

            <motion.button
              onClick={handleGenerate}
              disabled={isGenerating || !resumeText}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full mt-6 py-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/[0.04] disabled:text-white/20 transition-all flex items-center justify-center gap-2">
              {isGenerating ? (
                <><Loader2 size={16} className="animate-spin" /> Generating questions...</>
              ) : (
                <><Zap size={16} /> Generate Interview Questions</>
              )}
            </motion.button>
          </motion.div>
        )}

        {/* ═══════ READY PHASE ═══════ */}
        {phase === "ready" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center mt-20">
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Play size={32} className="text-indigo-400 ml-1" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{questions.length} questions ready</h2>
            <p className="text-white/30 text-sm mb-8">
              AI will ask questions using text-to-speech. Answer using your microphone. You'll get feedback after each answer.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={toggleCamera}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${cameraOn ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-white/[0.03] border-white/[0.06] text-white/40"}`}>
                {cameraOn
                  ? <><Camera size={14} className="inline mr-2" />Camera On</>
                  : <><CameraOff size={14} className="inline mr-2" />Camera Off</>}
              </button>
              <button
                onClick={startInterview}
                className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 transition-all">
                Start Interview
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════ INTERVIEW PHASE ═══════ */}
        {phase === "interview" && (
          <div className="grid lg:grid-cols-[1fr_1fr] gap-5">

            {/* LEFT — Robot + Question */}
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="relative h-72 flex items-center justify-center bg-gradient-to-b from-indigo-950/20 to-transparent">
                  <AiRobot3D isSpeaking={isSpeaking} />
                  {isSpeaking && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                      {[0, 1, 2, 3, 4].map(i => (
                        <motion.div
                          key={i}
                          className="w-1 bg-indigo-400 rounded-full"
                          animate={{ height: [8, 20, 8] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-5 border-t border-white/[0.06]">
                  <div className="text-[10px] text-indigo-400/60 font-semibold uppercase tracking-wider mb-2">
                    Question {index + 1} of {totalQ}
                  </div>
                  <p className="text-lg font-medium leading-relaxed text-white/90">{currentQ}</p>
                </div>
              </div>

              {/* Camera */}
              {cameraOn && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden h-44">
                  <video ref={videoRef} className="w-full h-full object-cover opacity-60" muted />
                </div>
              )}
            </div>

            {/* RIGHT — Answer + Feedback */}
            <div className="space-y-4">

              {/* Answer box */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Your answer</span>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                    isRecording
                      ? "bg-red-500/15 text-red-400"
                      : isAnalyzing
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-white/[0.04] text-white/20"
                  }`}>
                    {isRecording && <><div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" /> Recording</>}
                    {isAnalyzing && <><Loader2 size={10} className="animate-spin" /> Analyzing</>}
                    {!isRecording && !isAnalyzing && "Ready"}
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 min-h-[140px] text-sm leading-relaxed">
                  {answer ? (
                    <span className="text-white/80">
                      {answer}
                      {partial && <span className="text-indigo-400/50"> {partial}</span>}
                    </span>
                  ) : (
                    <span className="text-white/15 italic">
                      {isRecording ? "Listening..." : "Press the mic button to start answering"}
                    </span>
                  )}
                </div>

                {/* Controls */}
                <div className="flex gap-3 mt-4">
                  {!showFeedback ? (
                    <>
                      <button
                        onClick={() => isRecording ? stopRecording() : startRecording()}
                        disabled={isAnalyzing}
                        className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          isRecording
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}>
                        {isRecording
                          ? <><MicOff size={16} /> Stop Recording</>
                          : <><Mic size={16} /> Start Recording</>}
                      </button>
                      <button
                        onClick={() => submitAnswer()}
                        disabled={answer.length < 5 || isAnalyzing}
                        className="px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/[0.04] disabled:text-white/20 transition-all flex items-center gap-2">
                        {isAnalyzing
                          ? <Loader2 size={16} className="animate-spin" />
                          : <CheckCircle2 size={16} />}
                        Submit
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={nextQuestion}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2">
                      {index + 1 >= questions.length
                        ? "Finish"
                        : <><SkipForward size={16} /> Next Question</>}
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {showFeedback && feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">

                    {/* Score */}
                    <div className="flex items-center gap-4">
                      <div className={`text-3xl font-bold ${
                        (feedback.score || 0) >= 7 ? "text-emerald-400" :
                        (feedback.score || 0) >= 4 ? "text-amber-400" : "text-red-400"
                      }`}>{feedback.score || 0}/10</div>
                      <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(feedback.score || 0) * 10}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            (feedback.score || 0) >= 7 ? "bg-emerald-500" :
                            (feedback.score || 0) >= 4 ? "bg-amber-500" : "bg-red-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Strengths */}
                    {feedback.strengths?.length > 0 && (
                      <div>
                        <div className="text-[10px] text-emerald-400/60 font-semibold uppercase tracking-wider mb-2">Strengths</div>
                        {feedback.strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-white/60 mb-1">
                            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>{renderSafe(s)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Improvements */}
                    {feedback.improvements?.length > 0 && (
                      <div>
                        <div className="text-[10px] text-amber-400/60 font-semibold uppercase tracking-wider mb-2">Improve</div>
                        {feedback.improvements.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-white/60 mb-1">
                            <XCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                            <span>{renderSafe(s)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Better answer */}
                    {feedback.betterAnswerExample && (
                      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
                        <div className="text-[10px] text-indigo-400/60 font-semibold uppercase tracking-wider mb-2">Suggested answer</div>
                        <p className="text-sm text-white/50 leading-relaxed italic">{renderSafe(feedback.betterAnswerExample)}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ═══════ SUMMARY PHASE ═══════ */}
        {phase === "summary" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto text-center mt-16">
            <div className={`text-6xl font-bold mb-2 ${
              Number(avgScore) >= 7 ? "text-emerald-400" :
              Number(avgScore) >= 4 ? "text-amber-400" : "text-red-400"
            }`}>{avgScore}/10</div>
            <p className="text-white/30 text-sm mb-2">Average score across {scores.length} questions</p>

            <div className="flex gap-2 justify-center flex-wrap mt-4 mb-8">
              {scores.map((s, i) => (
                <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  s >= 7 ? "bg-emerald-500/20 text-emerald-400" :
                  s >= 4 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                }`}>{s}</div>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setPhase("setup"); setQuestions([]); setScores([]); setIndex(0); }}
                className="px-6 py-3 rounded-xl text-sm font-semibold bg-white/[0.04] hover:bg-white/[0.08] transition-all flex items-center gap-2 border border-white/[0.06]">
                <RotateCcw size={16} /> Start Over
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 transition-all">
                Back Home
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}