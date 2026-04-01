"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebaseConfig";
import AiRobot3D from "../../components/AiRobot3D";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist"; 
import {
  Mic, MicOff, Camera, CameraOff, Play, SkipForward,
  FileText, Briefcase, Search, Loader2, CheckCircle2,
  Zap, RotateCcw, Volume2, VolumeX, LayoutDashboard,
  BrainCircuit, Target, AlertCircle, PhoneOff,
  Shield, Star, TrendingUp, Clock, Award,
  Activity, Sparkles, ArrowRight, BarChart3, Cpu,
  Coins, ChevronDown, Bolt, Flame, Gauge
} from "lucide-react";

// Initialize PDF Worker with a stable version-matching CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

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

type AiModel = {
  id: string;
  name: string;
  provider: string;
  badge: string;
  badgeColor: string;
  speed: string;   // e.g. "~1s"
  quality: string; // "Best" | "Great" | "Fast"
  creditsPerQ: number;
  icon: string;    // emoji
};

// ═══════════════════════════════════════════════════════════════
// AI MODELS CONFIG
// ═══════════════════════════════════════════════════════════════
const AI_MODELS: AiModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    badge: "Recommended",
    badgeColor: "emerald",
    speed: "~2s",
    quality: "Best",
    creditsPerQ: 5,
    icon: "🤖",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    badge: "Balanced",
    badgeColor: "indigo",
    speed: "~1s",
    quality: "Great",
    creditsPerQ: 2,
    icon: "⚡",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    badge: "Multimodal",
    badgeColor: "blue",
    speed: "~2s",
    quality: "Best",
    creditsPerQ: 5,
    icon: "💎",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini Flash",
    provider: "Google",
    badge: "Fastest",
    badgeColor: "cyan",
    speed: "~0.5s",
    quality: "Fast",
    creditsPerQ: 1,
    icon: "🌟",
  },
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "Groq",
    badge: "Instant",
    badgeColor: "violet",
    speed: "~0.3s",
    quality: "Great",
    creditsPerQ: 2,
    icon: "🦙",
  },
  {
    id: "mixtral-8x7b",
    name: "Mixtral 8x7B",
    provider: "Groq",
    badge: "Ultra Fast",
    badgeColor: "purple",
    speed: "~0.2s",
    quality: "Good",
    creditsPerQ: 1,
    icon: "🚀",
  },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

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

// Robust question normalizer — handles all possible API response shapes
const normalizeQuestions = (res: any): string[] => {
  const candidates = [
    res?.questions,
    res?.data?.questions,
    res?.result?.questions,
    res?.data,
    res?.result,
    Array.isArray(res) ? res : null,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      const mapped = c.map((x: any) => {
        if (typeof x === "string") return x.trim();
        if (typeof x === "object" && x !== null) {
          return (x.question || x.text || x.content || JSON.stringify(x)).trim();
        }
        return String(x).trim();
      }).filter(Boolean);
      if (mapped.length > 0) return mapped;
    }
  }
  return [];
};

const shuffle = (arr: string[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const scoreColor = (score: number) => {
  if (score >= 8) return { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" };
  if (score >= 5) return { text: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" };
  return { text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" };
};

const badgeColors: Record<string, string> = {
  emerald: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  indigo:  "bg-indigo-500/10 border-indigo-500/25 text-indigo-400",
  blue:    "bg-blue-500/10 border-blue-500/25 text-blue-400",
  cyan:    "bg-cyan-500/10 border-cyan-500/25 text-cyan-400",
  violet:  "bg-violet-500/10 border-violet-500/25 text-violet-400",
  purple:  "bg-purple-500/10 border-purple-500/25 text-purple-400",
};

// ═══════════════════════════════════════════════════════════════
// SCORE RING
// ═══════════════════════════════════════════════════════════════
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 10) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={score >= 8 ? "#34d399" : score >= 5 ? "#fbbf24" : "#f87171"}
        strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// PULSE BARS
// ═══════════════════════════════════════════════════════════════
function PulseBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-5">
      {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6].map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-indigo-400"
          animate={active ? { scaleY: [h, 1, h * 0.3, h] } : { scaleY: 0.2 }}
          transition={active ? { duration: 0.6, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" } : {}}
          style={{ height: "100%", transformOrigin: "center" }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════
function StatCard({ icon: Icon, label, value, sub, color = "indigo" }: any) {
  const colors: any = {
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  };
  return (
    <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-colors group">
      <div className={`p-3 rounded-xl border ${colors[color]} shrink-0 group-hover:scale-110 transition-transform`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-0.5">{label}</p>
        <p className="text-xl font-black text-white/90 leading-none">{value}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODEL CARD
// ═══════════════════════════════════════════════════════════════
function ModelCard({ model, selected, onSelect }: { model: AiModel; selected: boolean; onSelect: () => void }) {
  const isSelected = selected;
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
        isSelected
          ? "border-indigo-500/40 bg-indigo-500/[0.07]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]"
      }`}
    >
      {isSelected && (
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{model.icon}</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold text-white/90">{model.name}</p>
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border ${badgeColors[model.badgeColor]}`}>
                {model.badge}
              </span>
            </div>
            <p className="text-[11px] text-white/30 font-medium">{model.provider}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
            <Bolt size={10} />
            {model.speed}
          </div>
          <div className="text-[10px] text-white/25">{model.creditsPerQ} cr/Q</div>
        </div>
      </div>
      {/* Speed + quality bar */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: model.quality === "Best" ? "100%" : model.quality === "Great" ? "75%" : model.quality === "Good" ? "55%" : "40%",
              background: model.quality === "Best" ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : model.quality === "Great" ? "#6366f1" : model.quality === "Good" ? "#8b5cf6" : "#06b6d4",
            }}
          />
        </div>
        <span className="text-[9px] text-white/25 font-semibold w-8 text-right">{model.quality}</span>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function MockInterviewPage() {
  const [phase, setPhase] = useState<"setup" | "ready" | "interview" | "summary">("setup");

  // Setup
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState("");

  // Model + session config
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [questionCount, setQuestionCount] = useState(10);
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

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
  const [sessionTime, setSessionTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"transcript" | "history">("transcript");

  // Camera
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Speechmatics
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const smStartedRef = useRef(false);
  const answerRef = useRef("");
  const isRecordingRef = useRef(false);
  const isAnalyzingRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQ = questions[index] || "Tell me about yourself.";
  const totalQ = questions.length || 1;
  const progress = ((index + 1) / totalQ) * 100;
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—";
  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const activeModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];
  const estimatedCredits = activeModel.creditsPerQ * questionCount;

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { isAnalyzingRef.current = isAnalyzing; }, [isAnalyzing]);

  // Fetch credits when entering ready phase
  useEffect(() => {
    if (phase === "ready") {
      setLoadingCredits(true);
      fetch(`/api/credits?email=${encodeURIComponent(getEmail())}`)
        .then(r => r.json())
        .then(d => setCredits(d?.credits ?? d?.balance ?? null))
        .catch(() => setCredits(null))
        .finally(() => setLoadingCredits(false));
    }
  }, [phase]);

  // Session timer
  useEffect(() => {
    if (phase === "interview") {
      timerRef.current = setInterval(() => setSessionTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

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

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) { window.clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    smStartedRef.current = false;
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ message: "EndOfStream" }));
    wsRef.current?.close(); wsRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;
    isRecordingRef.current = false;
    setIsRecording(false);
    setPartial("");
  }, [clearSilenceTimer]);

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

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isAnalyzingRef.current || wsRef.current) return;
    try {
      const tokenRes = await fetch(`/api/stt/tokens?email=${encodeURIComponent(getEmail())}`, { method: "GET" });
      if (!tokenRes.ok) return;
      const tokenData = await tokenRes.json();
      const token = tokenData.token || tokenData.key || tokenData.jwt;
      if (!token) return;

      const ws = new WebSocket(`wss://eu.rt.speechmatics.com/v2/en?jwt=${token}`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          message: "StartRecognition",
          audio_format: { type: "file" },
          transcription_config: { language: "en", operating_point: "enhanced", enable_partials: true },
        }));
      };

      ws.onmessage = async (e) => {
        if (typeof e.data !== "string") return;
        const msg = JSON.parse(e.data);
        if (msg.message === "RecognitionStarted") {
          smStartedRef.current = true; isRecordingRef.current = true; setIsRecording(true);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = async (ev) => {
              if (ev.data.size > 0 && ws.readyState === WebSocket.OPEN && smStartedRef.current)
                ws.send(await ev.data.arrayBuffer());
            };
            recorder.start(250);
          } catch { stopRecording(); }
        }
        if (msg.message === "AddTranscript" && msg.metadata?.transcript) {
          answerRef.current = (answerRef.current + " " + msg.metadata.transcript).trim();
          setAnswer(answerRef.current); setPartial(""); resetSilenceTimer();
        }
        if (msg.message === "AddPartialTranscript" && msg.metadata?.transcript) {
          setPartial(msg.metadata.transcript); resetSilenceTimer();
        }
        if (msg.message === "Error") stopRecording();
      };
      ws.onerror = () => stopRecording();
      ws.onclose = () => { isRecordingRef.current = false; setIsRecording(false); smStartedRef.current = false; wsRef.current = null; };
    } catch { isRecordingRef.current = false; setIsRecording(false); }
  }, [stopRecording, resetSilenceTimer]);

  const submitAnswer = useCallback(async (finalAns?: string) => {
    const ans = (finalAns || answerRef.current || "").trim();
    if (ans.length < 5 || isAnalyzingRef.current) return;
    stopRecording();
    window.speechSynthesis.cancel();
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    const currentQuestion = questions[index] || "Tell me about yourself.";
    const newHistory: InterviewTurn[] = [...history, { role: "interviewer", text: currentQuestion }, { role: "candidate", text: ans }];
    setHistory(newHistory);
    try {
      const isTooShort = ans.split(/\s+/).length < 5;
      const mode = isTooShort ? "generate_script" : "generate_feedback";
      const res = await fetchAi({ mode, question: currentQuestion, answer: ans, resume: resumeText, jd: jdText, model: selectedModel, conversationHistory: newHistory });
      if (isTooShort) {
        setFeedback({ score: 0, strengths: [], improvements: ["Your answer was too short. Try to give 2-3 full sentences."], betterAnswerExample: res?.betterAnswerExample || "", resume_proof: "" });
      } else { setFeedback(res); }
      setScores(prev => [...prev, res?.score || 0]);
    } catch {
      setFeedback({ score: 0, strengths: [], improvements: ["Error getting feedback. Please try again."], betterAnswerExample: "", resume_proof: "" });
    }
    isAnalyzingRef.current = false; setIsAnalyzing(false); setShowFeedback(true);
  }, [stopRecording, questions, index, history, resumeText, jdText, selectedModel]);

  useEffect(() => { submitAnswerRef.current = submitAnswer; }, [submitAnswer]);

  const speakQuestion = useCallback((text: string) => {
    if (!ttsEnabled) { setTimeout(() => startRecording(), 300); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => { setIsSpeaking(false); setTimeout(() => startRecording(), 800); };
    utter.onerror = () => { setIsSpeaking(false); setTimeout(() => startRecording(), 300); };
    window.speechSynthesis.speak(utter);
  }, [ttsEnabled, startRecording]);

  const nextQuestion = () => {
    const next = index + 1;
    if (next >= questions.length) { setPhase("summary"); return; }
    setIndex(next); setAnswer(""); answerRef.current = ""; setPartial("");
    setFeedback(null); setShowFeedback(false);
    setTimeout(() => speakQuestion(questions[next]), 500);
  };

  // ── GENERATE — robust question count enforcement ──
  const handleGenerate = async () => {
    if (!resumeText.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetchAi({
        mode: "generate_questions",
        resume: resumeText,
        jd: jdText,
        model: selectedModel,
        count: questionCount,          // tell the API how many we want
        num_questions: questionCount,  // fallback key name some APIs use
      });

      let qs = normalizeQuestions(res);

      // If API still returned too few, log it but continue
      if (qs.length === 0) {
        console.warn("API returned 0 questions. Response:", res);
        alert("The AI returned no questions. Try adding more detail to your resume or job description.");
        setIsGenerating(false);
        return;
      }

      // De-dupe and shuffle
      const deduped = Array.from(new Set(qs.map(q => q.trim()))).filter(Boolean);
      const shuffled = shuffle(deduped.filter(q => q.toLowerCase() !== "tell me about yourself."));
      const final = ["Tell me about yourself.", ...shuffled];

      // Enforce the user-selected count (cap at what we got if fewer returned)
      setQuestions(final.slice(0, questionCount));
      setPhase("ready");
    } catch (err) {
      console.error("Generate error:", err);
      alert("Failed to generate questions. Please check your credits and try again.");
    }
    setIsGenerating(false);
  };

  const handleVerify = async () => {
    if (resumeText.length < 50) return;
    setIsVerifying(true); setVerificationResult("");
    try {
      const data = await fetchAi({ mode: "verify_resume", resume: resumeText, jd: jdText || "N/A" });
      setVerificationResult(data?.summary || "No summary returned.");
    } catch { setVerificationResult("Verification failed."); }
    setIsVerifying(false);
  };

  const startInterview = () => {
    setPhase("interview"); setIndex(0); setAnswer(""); answerRef.current = "";
    setScores([]); setHistory([]); setFeedback(null); setShowFeedback(false); setSessionTime(0);
    setTimeout(() => speakQuestion(questions[0] || "Tell me about yourself."), 500);
  };

  useEffect(() => {
    return () => { stopRecording(); window.speechSynthesis.cancel(); streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [stopRecording]);

  // ── UPDATED FILE UPLOAD (STRICTLY ADDED PDF SUPPORT) ──
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "txt") {
        setResumeText(await file.text());
      } else if (ext === "docx" || ext === "doc") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (result.value?.trim()) {
          setResumeText(result.value);
        } else {
          alert("Could not extract text from this Word file. Please paste your resume text directly.");
        }
      } else if (ext === "pdf") {
        // PDF EXTRACTION LOGIC
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ 
          data: arrayBuffer,
          useSystemFonts: true,
          disableFontFace: true 
        });
        const pdf = await loadingTask.promise;
        
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
          fullText += pageText + "\n";
        }

        if (fullText.trim()) {
          setResumeText(fullText);
        } else {
          alert("Could not extract text from this PDF. It might be an image scan.");
        }
      } else {
        alert("Unsupported file type. Please upload a .pdf, .txt or .docx file.");
      }
    } catch (err) {
      console.error("File read error:", err);
      alert("Failed to read the file. Please paste your resume text directly.");
    }
    e.target.value = "";
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "linear-gradient(135deg, #030308 0%, #07070f 50%, #030308 100%)", fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}
    >
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full opacity-[0.025]" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.04]" style={{ background: "rgba(3,3,8,0.85)", backdropFilter: "blur(24px)" }}>
        <div className="max-w-[1400px] mx-auto px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                <BrainCircuit size={18} className="text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#030308]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-bold tracking-tight text-white/95">InterviewOS</span>
              <span className="text-[10px] text-white/30 font-medium tracking-widest uppercase">AI Interview Suite</span>
            </div>
          </div>

          {/* Stepper */}
          <div className="hidden lg:flex items-center">
            {[
              { label: "Configure", icon: FileText },
              { label: "Preflight", icon: Shield },
              { label: "Interview", icon: Mic },
              { label: "Analytics", icon: BarChart3 },
            ].map((step, i) => {
              const phases = ["setup", "ready", "interview", "summary"];
              const isActive = phase === phases[i];
              const isPast = phases.indexOf(phase) > i;
              return (
                <div key={step.label} className="flex items-center">
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${isActive ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30" : isPast ? "text-emerald-400/70" : "text-white/20"}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${isActive ? "bg-indigo-500 text-white" : isPast ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/20"}`}>
                      {isPast ? <CheckCircle2 size={11} /> : i + 1}
                    </div>
                    {step.label}
                  </div>
                  {i < 3 && <div className="w-6 h-px bg-white/[0.06] mx-1" />}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {phase === "interview" && (
              <>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/40 font-mono">
                  <Clock size={12} className="text-white/30" /> {formatTime(sessionTime)}
                </div>
                {scores.length > 0 && (
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs">
                    <Star size={12} className="text-amber-400" />
                    <span className="text-white/60 font-semibold">{avgScore} avg</span>
                  </div>
                )}
                <button
                  onClick={() => { stopRecording(); window.speechSynthesis.cancel(); setPhase("summary"); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border"
                  style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)", color: "#f87171" }}
                >
                  <PhoneOff size={14} /> End Session
                </button>
              </>
            )}
          </div>
        </div>
        {phase === "interview" && (
          <div className="h-[1px] w-full bg-white/[0.03]">
            <motion.div className="h-full" style={{ background: "linear-gradient(90deg, #4f46e5, #7c3aed)" }}
              animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
          </div>
        )}
      </nav>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════════════════════
              SETUP PHASE
          ═══════════════════════════════════════════════════════ */}
          {phase === "setup" && (
            <motion.div key="setup" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}
              className="grid lg:grid-cols-[1fr_400px] gap-8 max-w-5xl mx-auto">

              {/* Left */}
              <div className="space-y-5">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 border"
                    style={{ background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
                    <Sparkles size={10} /> AI-Powered Session
                  </div>
                  <h2 className="text-[2.2rem] font-black tracking-tight leading-none mb-3 text-white/95">
                    Configure Your<br />
                    <span style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      Interview Session
                    </span>
                  </h2>
                  <p className="text-white/35 text-sm leading-relaxed max-w-md">
                    Provide your professional context for a precision-tailored interview experience with role-specific questions and real-time AI evaluation.
                  </p>
                </div>

                {/* Resume card */}
                <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg border" style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.2)" }}>
                        <FileText size={15} className="text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white/85">Resume / CV</p>
                        <p className="text-[11px] text-white/30">Paste full text or upload .txt / .docx / .pdf</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/10 hover:bg-white/[0.03]">
                      <input type="file" onChange={handleFile} className="hidden" accept=".txt,.doc,.docx,.pdf" />
                      Upload File
                    </label>
                  </div>
                  <div className="p-1">
                    <textarea
                      value={resumeText}
                      onChange={e => setResumeText(e.target.value)}
                      className="w-full h-52 p-5 text-sm text-white/75 placeholder:text-white/15 outline-none resize-none custom-scrollbar"
                      style={{ background: "transparent", caretColor: "#818cf8" }}
                      placeholder="Paste your complete resume here — work experience, skills, education, and accomplishments..."
                    />
                  </div>
                  {resumeText.length > 50 && (
                    <div className="px-6 pb-4 border-t border-white/[0.04] pt-4">
                      <button onClick={handleVerify} disabled={isVerifying}
                        className="flex items-center gap-2 text-xs font-semibold text-emerald-400/80 hover:text-emerald-300 transition-colors">
                        {isVerifying ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                        {isVerifying ? "Analyzing profile..." : "Run profile analysis"}
                      </button>
                      {verificationResult && (
                        <div className="w-full mt-3 p-4 rounded-xl text-xs text-emerald-200/70 leading-relaxed whitespace-pre-wrap border"
                          style={{ background: "rgba(52,211,153,0.03)", borderColor: "rgba(52,211,153,0.1)" }}>
                          {verificationResult}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* JD card */}
                <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.05]">
                    <div className="p-2 rounded-lg border" style={{ background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.2)" }}>
                      <Briefcase size={15} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/85">Job Description</p>
                      <p className="text-[11px] text-white/30">Optional · Strongly recommended for precision targeting</p>
                    </div>
                  </div>
                  <div className="p-1">
                    <textarea
                      value={jdText}
                      onChange={e => setJdText(e.target.value)}
                      className="w-full h-36 p-5 text-sm text-white/75 placeholder:text-white/15 outline-none resize-none custom-scrollbar"
                      style={{ background: "transparent", caretColor: "#c084fc" }}
                      placeholder="Paste the target job description to calibrate interview style, difficulty, and domain-specific questions..."
                    />
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-5">
                {/* AI Model Picker */}
                <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <button
                    onClick={() => setShowModelPicker(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg border" style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.2)" }}>
                        <Cpu size={15} className="text-indigo-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white/85">AI Model</p>
                        <p className="text-[11px] text-white/35">{activeModel.icon} {activeModel.name} · {activeModel.provider} · {activeModel.speed} response</p>
                      </div>
                    </div>
                    <ChevronDown size={16} className={`text-white/30 transition-transform ${showModelPicker ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {showModelPicker && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-white/[0.05]"
                      >
                        <div className="p-3 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                          {AI_MODELS.map(model => (
                            <ModelCard
                              key={model.id}
                              model={model}
                              selected={selectedModel === model.id}
                              onSelect={() => { setSelectedModel(model.id); setShowModelPicker(false); }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Question Count */}
                <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg border" style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.2)" }}>
                      <Gauge size={15} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/85">Question Count</p>
                      <p className="text-[11px] text-white/30">How many questions in this session</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {QUESTION_COUNTS.map(count => (
                      <button
                        key={count}
                        onClick={() => setQuestionCount(count)}
                        className={`py-2.5 rounded-xl text-sm font-black border transition-all ${
                          questionCount === count
                            ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                            : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/60 hover:border-white/10"
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/25 mt-3 text-center">
                    Est. {Math.round(questionCount * 2.5)} min session · ~{estimatedCredits} credits
                  </p>
                </div>

                {/* Guidelines */}
                <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Session guidelines</p>
                  <ul className="space-y-2.5">
                    {[
                      "Use a quiet environment for best transcription accuracy",
                      "Answer in 1–3 minutes using the STAR method when possible",
                      "Silence detection auto-submits after 3.5 seconds of quiet",
                    ].map((tip, i) => (
                      <li key={i} className="flex gap-2.5 text-xs text-white/45 leading-relaxed">
                        <span className="mt-0.5 w-4 h-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[9px] font-black text-indigo-400 shrink-0">{i + 1}</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <motion.button
                  onClick={handleGenerate}
                  disabled={isGenerating || !resumeText.trim()}
                  whileHover={!isGenerating && resumeText ? { scale: 1.01 } : {}}
                  whileTap={!isGenerating && resumeText ? { scale: 0.98 } : {}}
                  className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: isGenerating || !resumeText ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: isGenerating || !resumeText ? "rgba(255,255,255,0.2)" : "white",
                    boxShadow: isGenerating || !resumeText ? "none" : "0 0 40px rgba(79,70,229,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
                  }}
                >
                  {isGenerating ? <><Loader2 size={17} className="animate-spin" /> Generating {questionCount} Questions...</> : <><Zap size={17} /> Launch Session <ArrowRight size={15} /></>}
                </motion.button>

                <p className="text-center text-[10px] text-white/20">Secured by enterprise-grade encryption · Data not stored</p>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              PREFLIGHT PHASE
          ═══════════════════════════════════════════════════════ */}
          {phase === "ready" && (
            <motion.div key="ready" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.35 }}
              className="max-w-5xl mx-auto">

              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 border"
                  style={{ background: "rgba(52,211,153,0.07)", borderColor: "rgba(52,211,153,0.2)", color: "#34d399" }}>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> System Ready
                </div>
                <h2 className="text-[2.5rem] font-black tracking-tight mb-2 text-white/95">Preflight Check</h2>
                <p className="text-white/35 text-sm">
                  Your AI has prepared <strong className="text-white/80 font-black">{questions.length}</strong> personalized questions using <strong className="text-indigo-300">{activeModel.icon} {activeModel.name}</strong>
                </p>
              </div>

              <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">

                {/* Left: Camera + toggles */}
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/[0.07]" style={{ background: "#07070f" }}>
                    {cameraOn ? (
                      <video ref={videoRef} className="w-full h-full object-cover" muted />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <CameraOff size={36} className="text-white/10" />
                        <p className="text-xs text-white/20 font-medium">Camera disabled</p>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", borderColor: "rgba(255,255,255,0.08)", color: cameraOn ? "#34d399" : "#f87171" }}>
                      <div className={`w-1.5 h-1.5 rounded-full ${cameraOn ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                      {cameraOn ? "Camera On" : "Camera Off"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={toggleCamera}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all ${cameraOn ? "text-white/70 border-white/08 bg-white/[0.03]" : "text-red-400 border-red-500/20 bg-red-500/[0.06]"}`}>
                      {cameraOn ? <Camera size={16} /> : <CameraOff size={16} />}
                      {cameraOn ? "Camera On" : "Enable Camera"}
                    </button>
                    <button onClick={() => setTtsEnabled(!ttsEnabled)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all ${ttsEnabled ? "text-white/70 border-white/08 bg-white/[0.03]" : "text-amber-400 border-amber-500/20 bg-amber-500/[0.06]"}`}>
                      {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      {ttsEnabled ? "Audio On" : "Audio Off"}
                    </button>
                  </div>
                </div>

                {/* Right: Status + Credits + Model + Details + CTA */}
                <div className="space-y-4">

                  {/* Credits banner */}
                  <div className="rounded-2xl border border-white/[0.06] p-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.015)" }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl border" style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.2)" }}>
                        <Coins size={16} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Credits Remaining</p>
                        <p className="text-xl font-black text-amber-400 leading-none mt-0.5">
                          {loadingCredits ? <Loader2 size={16} className="animate-spin inline" /> : credits !== null ? credits.toLocaleString() : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/25 mb-1">This session will use</p>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Flame size={13} className="text-orange-400" />
                        <span className="text-sm font-black text-orange-400">~{estimatedCredits}</span>
                        <span className="text-xs text-white/25">credits</span>
                      </div>
                      {credits !== null && credits < estimatedCredits && (
                        <p className="text-[10px] text-red-400 mt-1 font-semibold">⚠ Insufficient credits</p>
                      )}
                    </div>
                  </div>

                  {/* Active model + config summary */}
                  <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
                    <div className="px-5 py-3 border-b border-white/[0.04]">
                      <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Session Configuration</p>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {[
                        { label: "AI Model", value: `${activeModel.icon} ${activeModel.name}`, sub: activeModel.provider, ok: true },
                        { label: "Response Speed", value: activeModel.speed, sub: "avg latency", ok: true },
                        { label: "Questions", value: `${questions.length} prepared`, sub: `of ${questionCount} requested`, ok: questions.length >= questionCount * 0.8 },
                        { label: "Camera", value: cameraOn ? "Connected" : "Disabled", ok: cameraOn },
                        { label: "AI Voice", value: ttsEnabled ? "Enabled" : "Muted", ok: ttsEnabled },
                        { label: "Microphone", value: "Connected", ok: true },
                        { label: "Speech Recognition", value: "Active", ok: true },
                      ].map(({ label, value, sub, ok }) => (
                        <div key={label} className="flex items-center justify-between px-5 py-3">
                          <span className="text-sm text-white/55">{label}</span>
                          <div className="flex items-center gap-2 text-right">
                            {sub && <span className="text-[10px] text-white/20 hidden sm:block">{sub}</span>}
                            <div className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                            <span className={`text-xs font-bold ${ok ? "text-emerald-400/80" : "text-amber-400/80"}`}>{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Session stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="py-3 rounded-xl border border-white/[0.05] text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <p className="text-2xl font-black text-indigo-400">{questions.length}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">Questions</p>
                    </div>
                    <div className="py-3 rounded-xl border border-white/[0.05] text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <p className="text-2xl font-black text-violet-400">~{Math.round(questions.length * 2.5)}m</p>
                      <p className="text-[10px] text-white/30 mt-0.5">Duration</p>
                    </div>
                    <div className="py-3 rounded-xl border border-white/[0.05] text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <p className="text-2xl font-black text-cyan-400">{activeModel.speed}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">AI Speed</p>
                    </div>
                  </div>

                  <motion.button
                    onClick={startInterview}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 0 40px rgba(79,70,229,0.4), inset 0 1px 0 rgba(255,255,255,0.1)", color: "white" }}
                  >
                    <Play size={18} fill="white" /> Begin Interview
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              INTERVIEW PHASE
          ═══════════════════════════════════════════════════════ */}
          {phase === "interview" && (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid lg:grid-cols-[1.1fr_1fr] gap-5 h-[calc(100vh-100px)] min-h-[640px]">

              {/* LEFT: Room */}
              <div className="flex flex-col rounded-2xl border border-white/[0.06] overflow-hidden relative" style={{ background: "#06060e" }}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
                    </div>
                    <span className="text-xs font-semibold text-white/25">Interview Room · {activeModel.icon} {activeModel.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/30"><Clock size={11} />{formatTime(sessionTime)}</div>
                    <div className="text-[10px] font-bold text-white/25 uppercase tracking-wide">{index + 1} / {totalQ}</div>
                  </div>
                </div>

                <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.06) 0%, transparent 70%)" }} />
                  <AiRobot3D isSpeaking={isSpeaking} />
                  <AnimatePresence>
                    {isSpeaking && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        className="absolute top-5 left-5 flex items-center gap-3 px-3 py-2 rounded-xl border"
                        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.08)" }}>
                        <PulseBars active={isSpeaking} />
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">AI Speaking</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {cameraOn && (
                    <div className="absolute top-5 right-5 w-44 aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                      <video ref={videoRef} className="w-full h-full object-cover" muted />
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold"
                        style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.5)" }}>
                        <div className="w-1 h-1 bg-red-400 rounded-full" /> You
                      </div>
                    </div>
                  )}
                </div>

                {/* Control bar */}
                <div className="border-t border-white/[0.05] px-5 py-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(16px)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button onClick={toggleCamera}
                        className={`p-3 rounded-xl transition-all border ${cameraOn ? "border-white/08 text-white/50 hover:text-white/80 hover:bg-white/[0.04]" : "border-red-500/20 text-red-400/70 bg-red-500/[0.06] hover:bg-red-500/10"}`}>
                        {cameraOn ? <Camera size={17} /> : <CameraOff size={17} />}
                      </button>
                      <button onClick={() => setTtsEnabled(!ttsEnabled)}
                        className={`p-3 rounded-xl transition-all border ${ttsEnabled ? "border-white/08 text-white/50 hover:text-white/80 hover:bg-white/[0.04]" : "border-amber-500/20 text-amber-400/70 bg-amber-500/[0.06] hover:bg-amber-500/10"}`}>
                        {ttsEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
                      </button>
                    </div>

                    <div className="flex-1 flex justify-center">
                      {!showFeedback ? (
                        <motion.button
                          onClick={() => isRecording ? stopRecording() : startRecording()}
                          disabled={isAnalyzing}
                          whileHover={!isAnalyzing ? { scale: 1.03 } : {}}
                          whileTap={!isAnalyzing ? { scale: 0.97 } : {}}
                          className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 relative overflow-hidden"
                          style={isRecording ? {
                            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171",
                            boxShadow: "0 0 30px rgba(239,68,68,0.1)",
                          } : {
                            background: "linear-gradient(135deg, #4f46e5, #7c3aed)", border: "1px solid transparent", color: "white",
                            boxShadow: "0 0 30px rgba(79,70,229,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                          }}
                        >
                          {isAnalyzing ? <><Loader2 size={17} className="animate-spin" /> Analyzing...</>
                            : isRecording ? <><MicOff size={17} /> Stop Recording</>
                            : <><Mic size={17} /> Tap to Answer</>}
                          {isRecording && (
                            <motion.div className="absolute inset-0 rounded-xl"
                              animate={{ opacity: [0.15, 0.05, 0.15] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              style={{ background: "rgba(239,68,68,0.3)" }} />
                          )}
                        </motion.button>
                      ) : (
                        <motion.button onClick={nextQuestion} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-sm text-white"
                          style={{ background: "linear-gradient(135deg, #059669, #0d9488)", boxShadow: "0 0 30px rgba(5,150,105,0.25)" }}>
                          {index + 1 >= questions.length ? <><Award size={17} /> Finish & View Report</> : <><SkipForward size={17} /> Next Question</>}
                        </motion.button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {answer.length > 5 && !showFeedback && (
                        <button onClick={() => submitAnswer()} disabled={isAnalyzing}
                          className="p-3 rounded-xl border text-xs font-bold transition-all border-emerald-500/20 text-emerald-400/70 bg-emerald-500/[0.06] hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-30" title="Submit manually">
                          <CheckCircle2 size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                  {isRecording && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center justify-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                      <span className="text-[11px] text-white/30 font-medium">Recording · Auto-submits after 3.5s of silence</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* RIGHT: Analysis */}
              <div className="flex flex-col gap-4 h-full overflow-hidden">
                {/* Question card */}
                <div className="rounded-2xl border border-white/[0.06] p-5 shrink-0" style={{ background: "rgba(255,255,255,0.018)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Question {index + 1} of {totalQ}</span>
                      {jdText && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border" style={{ background: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.2)", color: "#c084fc" }}>Role-Specific</span>}
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      isRecording ? "text-red-400 border-red-500/20 bg-red-500/[0.07]"
                        : isAnalyzing ? "text-amber-400 border-amber-500/20 bg-amber-500/[0.07]"
                        : showFeedback ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.07]"
                        : "text-white/25 border-white/[0.06] bg-white/[0.03]"
                    }`}>
                      {isRecording && <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />}
                      {isAnalyzing && <Loader2 size={10} className="animate-spin" />}
                      {showFeedback && <CheckCircle2 size={10} />}
                      {isRecording ? "Recording" : isAnalyzing ? "Analyzing" : showFeedback ? "Evaluated" : "Standby"}
                    </div>
                  </div>
                  <p className="text-base font-semibold text-white/88 leading-snug">{currentQ}</p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 shrink-0 p-1 rounded-xl border border-white/[0.05]" style={{ background: "rgba(255,255,255,0.01)" }}>
                  {(["transcript", "history"] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${activeTab === tab ? "text-white bg-white/[0.06] border border-white/[0.06]" : "text-white/30 hover:text-white/50"}`}>
                      {tab === "transcript" ? "Live Transcript" : "Conversation"}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 rounded-2xl border border-white/[0.06] overflow-hidden relative" style={{ background: "rgba(255,255,255,0.015)" }}>
                  {activeTab === "transcript" && (
                    <div className="h-full flex flex-col">
                      {!showFeedback ? (
                        <div className="h-full flex flex-col p-5">
                          <div className="flex-1 text-sm leading-relaxed text-white/75 font-medium overflow-y-auto custom-scrollbar">
                            {answer ? (
                              <span>{answer}{partial && <span className="text-indigo-400/50 animate-pulse"> {partial}</span>}</span>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-3">
                                <div className="w-10 h-10 rounded-full border border-white/[0.06] flex items-center justify-center">
                                  <Mic size={16} className="text-white/20" />
                                </div>
                                <p className="text-sm text-white/20">{isRecording ? "Listening to your response..." : "Tap the button to start answering"}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {feedback && (
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="h-full overflow-y-auto custom-scrollbar">
                              <div className="sticky top-0 px-5 py-4 border-b border-white/[0.05] flex items-center justify-between"
                                style={{ background: "rgba(6,6,14,0.85)", backdropFilter: "blur(12px)" }}>
                                <div>
                                  <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Evaluation</p>
                                  <p className="text-sm font-semibold text-white/60 mt-0.5">Question {index + 1} complete</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="relative w-14 h-14">
                                    <ScoreRing score={feedback.score || 0} size={56} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className={`text-base font-black ${scoreColor(feedback.score || 0).text}`}>{feedback.score || 0}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <p className={`text-xs font-black uppercase ${scoreColor(feedback.score || 0).text}`}>
                                      {(feedback.score || 0) >= 8 ? "Excellent" : (feedback.score || 0) >= 5 ? "Good" : "Needs Work"}
                                    </p>
                                    <p className="text-[10px] text-white/25">out of 10</p>
                                  </div>
                                </div>
                              </div>
                              <div className="p-5 space-y-5">
                                {feedback.strengths?.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15"><CheckCircle2 size={12} className="text-emerald-400" /></div>
                                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Strengths</span>
                                    </div>
                                    <ul className="space-y-2">
                                      {feedback.strengths.map((s, i) => (
                                        <li key={i} className="flex gap-2.5 text-xs text-white/60 leading-relaxed">
                                          <span className="mt-1 w-1 h-1 bg-emerald-500/50 rounded-full shrink-0" />{renderSafe(s)}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {feedback.improvements?.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/15"><AlertCircle size={12} className="text-amber-400" /></div>
                                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">Areas to Improve</span>
                                    </div>
                                    <ul className="space-y-2">
                                      {feedback.improvements.map((s, i) => (
                                        <li key={i} className="flex gap-2.5 text-xs text-white/60 leading-relaxed">
                                          <span className="mt-1 w-1 h-1 bg-amber-500/50 rounded-full shrink-0" />{renderSafe(s)}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {feedback.betterAnswerExample && (
                                  <div className="rounded-xl p-4 border" style={{ background: "rgba(99,102,241,0.04)", borderColor: "rgba(99,102,241,0.12)" }}>
                                    <div className="flex items-center gap-2 mb-2"><Target size={12} className="text-indigo-400" /><span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Ideal Response</span></div>
                                    <p className="text-xs text-indigo-100/50 leading-relaxed italic">"{renderSafe(feedback.betterAnswerExample)}"</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                  )}

                  {activeTab === "history" && (
                    <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-3">
                      {history.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-xs text-white/20">Conversation history will appear here</p>
                        </div>
                      ) : history.map((turn, i) => (
                        <div key={i} className={`flex ${turn.role === "candidate" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] px-4 py-2.5 rounded-xl text-xs leading-relaxed border ${
                            turn.role === "interviewer" ? "text-white/60 border-white/[0.06]" : "text-white/80 border-indigo-500/15"
                          }`} style={{ background: turn.role === "interviewer" ? "rgba(255,255,255,0.02)" : "rgba(99,102,241,0.08)" }}>
                            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${turn.role === "interviewer" ? "text-white/25" : "text-indigo-400/60"}`}>
                              {turn.role === "interviewer" ? "AI Interviewer" : "You"}
                            </p>
                            {turn.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Score tracker */}
                {scores.length > 0 && (
                  <div className="rounded-xl border border-white/[0.05] p-3 shrink-0 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.01)" }}>
                    <span className="text-[10px] text-white/25 font-semibold uppercase tracking-widest whitespace-nowrap">Session Score</span>
                    <div className="flex-1 flex items-end gap-1.5 h-6">
                      {scores.map((s, i) => (
                        <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${s * 10}%` }} transition={{ duration: 0.5, delay: i * 0.05 }}
                          className={`flex-1 rounded-sm min-h-[3px] ${s >= 7 ? "bg-emerald-500/60" : s >= 4 ? "bg-amber-500/60" : "bg-red-500/60"}`}
                          title={`Q${i + 1}: ${s}/10`} />
                      ))}
                      {Array.from({ length: totalQ - scores.length }).map((_, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-white/[0.04] h-[3px]" />
                      ))}
                    </div>
                    <span className={`text-sm font-black ${scoreColor(parseFloat(avgScore) || 0).text}`}>{avgScore}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              SUMMARY PHASE
          ═══════════════════════════════════════════════════════ */}
          {phase === "summary" && (
            <motion.div key="summary" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto mt-6">
              <div className="text-center mb-10">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: "spring" }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 border"
                  style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.2), rgba(124,58,237,0.2))", borderColor: "rgba(99,102,241,0.3)", boxShadow: "0 0 40px rgba(79,70,229,0.2)" }}>
                  <Award size={28} className="text-indigo-400" />
                </motion.div>
                <h2 className="text-[2.5rem] font-black tracking-tight mb-2 text-white/95">Session Complete</h2>
                <p className="text-white/35 text-sm">Here is your comprehensive performance report · {activeModel.icon} {activeModel.name}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Star} label="Average Score" value={`${avgScore}/10`} color="indigo" />
                <StatCard icon={CheckCircle2} label="Questions" value={scores.length} sub={`of ${totalQ} answered`} color="emerald" />
                <StatCard icon={TrendingUp} label="Top Score" value={`${Math.max(...(scores.length ? scores : [0]))}/10`} color="violet" />
                <StatCard icon={Clock} label="Duration" value={formatTime(sessionTime)} color="amber" />
              </div>

              <div className="grid md:grid-cols-[280px_1fr] gap-5 mb-6">
                <div className="rounded-2xl border border-white/[0.06] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15), transparent 70%)" }} />
                  <div className="relative">
                    <ScoreRing score={parseFloat(avgScore) || 0} size={130} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-black leading-none ${scoreColor(parseFloat(avgScore) || 0).text}`}>{avgScore}</span>
                      <span className="text-xs text-white/25 font-semibold mt-0.5">/ 10</span>
                    </div>
                  </div>
                  <p className={`mt-4 text-sm font-black uppercase tracking-widest ${scoreColor(parseFloat(avgScore) || 0).text}`}>
                    {parseFloat(avgScore) >= 8 ? "Outstanding" : parseFloat(avgScore) >= 6 ? "Proficient" : parseFloat(avgScore) >= 4 ? "Developing" : "Needs Practice"}
                  </p>
                  <p className="text-xs text-white/25 mt-1">Overall Performance</p>
                </div>

                <div className="rounded-2xl border border-white/[0.06] p-6" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <div className="flex items-center gap-3 mb-5">
                    <BarChart3 size={16} className="text-indigo-400" />
                    <h3 className="text-sm font-bold text-white/80">Score Breakdown by Question</h3>
                  </div>
                  <div className="space-y-3">
                    {scores.map((s, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-white/25 w-5">Q{i + 1}</span>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${s * 10}%` }} transition={{ duration: 0.8, delay: i * 0.07, ease: "easeOut" }}
                            className={`h-full rounded-full ${s >= 7 ? "bg-emerald-500" : s >= 4 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ boxShadow: s >= 7 ? "0 0 8px rgba(52,211,153,0.4)" : s >= 4 ? "0 0 8px rgba(251,191,36,0.4)" : "0 0 8px rgba(248,113,113,0.4)" }} />
                        </div>
                        <span className={`text-sm font-black w-6 text-right ${scoreColor(s).text}`}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-white/[0.04]">
                <button onClick={() => { setPhase("setup"); setQuestions([]); setScores([]); setIndex(0); setSessionTime(0); }}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm border transition-all text-white/50 border-white/[0.07] hover:text-white/70 hover:border-white/10 hover:bg-white/[0.03]">
                  <RotateCcw size={16} /> New Session
                </button>
                <motion.button onClick={() => window.location.href = "/"} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 0 30px rgba(79,70,229,0.35)" }}>
                  <LayoutDashboard size={16} /> Return to Dashboard
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
        * { -webkit-font-smoothing: antialiased; }
      `}} />
    </div>
  );
}