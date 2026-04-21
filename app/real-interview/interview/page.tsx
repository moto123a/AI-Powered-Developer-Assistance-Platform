"use client";

// app/real-interview/interview/page.tsx

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, RotateCcw, Settings, X,
  Zap, Check, Cpu, Activity, Mic, MicOff,
  Loader2, Clock, ChevronDown, BrainCircuit,
  PhoneOff, MessageSquare, FileText,
  Sparkles, CheckCircle2,
} from "lucide-react";
import { useInterview }               from "../_hooks/useInterview";
import { useSession }                 from "../_hooks/useSession";
import { auth }                       from "../../firebaseConfig";
import { parseAnswer, isMicroAnswer } from "../_lib/formatAnswer";
import type { AppSettings }           from "../_lib/settings";
import {
  MODELS, loadSettings, saveSettings, DEFAULT_SETTINGS,
} from "../_lib/settings";

// ─────────────────────────────────────────────
// SETTINGS DRAWER
// ─────────────────────────────────────────────
function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [s, setS]         = useState<AppSettings>(() => {
    try { return loadSettings(); } catch { return DEFAULT_SETTINGS; }
  });
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) =>
    setS(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    saveSettings(s);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  };

  const tagColors: Record<string, string> = {
    blue:   "text-blue-400   bg-blue-500/10   border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    green:  "text-green-400  bg-green-500/10  border-green-500/20",
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    red:    "text-red-400    bg-red-500/10    border-red-500/20",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed right-0 top-0 h-full w-[320px] z-50 flex flex-col border-l border-white/[0.06]"
            style={{ background: "rgba(4,4,10,0.98)", backdropFilter: "blur(20px)" }}
          >
            <div className="h-14 px-5 flex items-center justify-between border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg border flex items-center justify-center"
                  style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.2)" }}>
                  <Settings size={11} className="text-indigo-400" />
                </div>
                <span className="text-[13px] font-bold text-white">Session Settings</span>
              </div>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg border flex items-center justify-center text-white/30 hover:text-white transition-all border-white/[0.07]"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <X size={12} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6
              [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-white/10">

              {/* Model */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={11} className="text-indigo-400" />
                  <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.4em]">AI Model</p>
                </div>
                <div className="space-y-1.5">
                  {MODELS.map(m => (
                    <button key={m.id} onClick={() => set("model", m.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all ${
                        s.model === m.id
                          ? "border-indigo-500/30"
                          : "border-white/[0.05] hover:border-white/10"
                      }`}
                      style={{ background: s.model === m.id ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)" }}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${s.model === m.id ? "bg-indigo-400" : "bg-white/10"}`} />
                        <span className={`text-[13px] font-semibold ${s.model === m.id ? "text-white" : "text-white/40"}`}>{m.label}</span>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-wider ${tagColors[m.color]}`}>{m.tag}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* STT */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Mic size={11} className="text-green-400" />
                  <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.4em]">Speech Recognition</p>
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] text-white/40 font-semibold">Transcription Delay</span>
                    <span className="text-[12px] font-black text-indigo-400 font-mono">{s.maxDelay}s</span>
                  </div>
                  <input type="range" min={0.7} max={2.0} step={0.1}
                    value={s.maxDelay} onChange={e => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) set("maxDelay", v); }}
                    className="w-full accent-indigo-500 cursor-pointer h-1" />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] text-white/15">Faster (0.7s)</span>
                    <span className="text-[9px] text-white/15">Accurate (2.0s)</span>
                  </div>
                </div>
                <div>
                  <span className="text-[12px] text-white/40 font-semibold block mb-2">Accuracy Mode</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["enhanced", "standard"] as const).map(op => (
                      <button key={op} onClick={() => set("operatingPoint", op)}
                        className={`py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                          s.operatingPoint === op
                            ? "bg-green-500/10 border-green-500/20 text-green-400"
                            : "border-white/[0.06] text-white/25 hover:border-white/10"
                        }`}>{op}</button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Temperature */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={11} className="text-purple-400" />
                  <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.4em]">Response Style</p>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-white/40 font-semibold">Temperature</span>
                  <span className="text-[12px] font-black text-purple-400 font-mono">{s.temperature}</span>
                </div>
                <input type="range" min={0.0} max={1.0} step={0.1}
                  value={s.temperature} onChange={e => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) set("temperature", v); }}
                  className="w-full accent-purple-500 cursor-pointer h-1" />
                <div className="flex justify-between mt-1.5">
                  <span className="text-[9px] text-white/15">Precise (0.0)</span>
                  <span className="text-[9px] text-white/15">Creative (1.0)</span>
                </div>
              </section>
            </div>

            <div className="p-4 border-t border-white/[0.06] shrink-0">
              <button onClick={handleSave}
                className={`w-full py-3 rounded-xl font-black text-[13px] flex items-center justify-center gap-2 transition-all ${
                  saved
                    ? "border border-green-500/25 text-green-400"
                    : "text-white"
                }`}
                style={saved
                  ? { background: "rgba(34,197,94,0.1)" }
                  : { background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 0 20px rgba(79,70,229,0.3)" }
                }>
                {saved ? <><Check size={14} /> Saved!</> : "Apply Settings"}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// PULSE BARS
// ─────────────────────────────────────────────
function PulseBars({ active, color = "#818cf8" }: { active: boolean; color?: string }) {
  return (
    <div className="flex items-center gap-[3px] h-5">
      {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6].map((h, i) => (
        <motion.div key={i}
          className="w-[2.5px] rounded-full"
          style={{ height: "100%", transformOrigin: "center", backgroundColor: color }}
          animate={active ? { scaleY: [h, 1, h * 0.3, h] } : { scaleY: 0.15 }}
          transition={active ? { duration: 0.6, repeat: Infinity, delay: i * 0.08 } : {}}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// ANSWER RENDERER
// ─────────────────────────────────────────────
function AnswerRenderer({
  answer, isGenerating, isRecording,
}: { answer: string; isGenerating: boolean; isRecording: boolean }) {

  if (isGenerating) return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-20">
      <div className="relative">
        <motion.div animate={{ scale: [1, 1.6], opacity: [0.25, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 rounded-full"
          style={{ background: "rgba(99,102,241,0.2)" }} />
        <div className="w-12 h-12 rounded-full border flex items-center justify-center relative z-10"
          style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.3)" }}>
          <BrainCircuit size={20} className="text-indigo-400" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-[13px] font-bold text-white/50">Generating response...</p>
        <p className="text-[11px] text-white/20 mt-1">Analyzing your resume against the question</p>
      </div>
    </div>
  );

  if (isRecording && !answer) return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-20">
      <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
        <div className="w-12 h-12 rounded-full border flex items-center justify-center"
          style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.2)" }}>
          <Mic size={20} className="text-emerald-400" />
        </div>
      </motion.div>
      <div className="text-center">
        <p className="text-[13px] font-bold text-white/50">Listening to interviewer...</p>
        <p className="text-[11px] text-white/20 mt-1">Press SPACE when ready to generate answer</p>
      </div>
    </div>
  );

  if (!answer) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
      <div className="w-12 h-12 rounded-full border flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
        <Sparkles size={18} className="text-white/15" />
      </div>
      <div className="text-center">
        <p className="text-[13px] font-bold text-white/20">Ready to assist</p>
        <p className="text-[11px] text-white/12 mt-1">Press SPACE to start listening</p>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <kbd className="text-[10px] font-mono font-bold text-white/20 px-3 py-1.5 rounded-lg border border-white/[0.08]"
          style={{ background: "rgba(255,255,255,0.03)" }}>SPACE</kbd>
        <span className="text-[11px] text-white/15">to listen & answer</span>
      </div>
    </div>
  );

  // Short MICRO answer
  if (isMicroAnswer(answer)) return (
    <motion.div key={answer} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[200px] px-8 py-10">
      <p className="text-[22px] font-semibold text-white/90 leading-relaxed text-center">
        {answer}
      </p>
    </motion.div>
  );

  // Bullet answer
  const lines = parseAnswer(answer);
  return (
    <motion.div key={answer.slice(0, 20)} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="space-y-5 py-4">
      {lines.map((line, i) =>
        line.type === "bullet" ? (
          <motion.div key={i}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-4 items-start p-4 rounded-xl border"
            style={{ background: "rgba(99,102,241,0.04)", borderColor: "rgba(99,102,241,0.1)" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 border"
              style={{ background: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.3)" }}>
              <CheckCircle2 size={12} className="text-indigo-400" />
            </div>
            <p className="text-[16px] font-medium text-white/88 leading-[1.75]">{line.text}</p>
          </motion.div>
        ) : (
          <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="text-white/40 text-[14px] leading-relaxed px-2">
            {line.text}
          </motion.p>
        )
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function InterviewPage() {
  const router                          = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied]             = useState(false);
  const [settings, setSettings]         = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab]       = useState<"response" | "history">("response");

  useEffect(() => { setSettings(loadSettings()); }, []);

  const raw    = typeof window !== "undefined"
    ? sessionStorage.getItem("interviewConfig") : null;
  const config = raw ? JSON.parse(raw) : {
    resume: "", jobDescription: "", companyName: "", role: "",
  };

  const userEmail = auth.currentUser?.email || "";

  const {
    isRecording, isGenerating,
    transcript, partial,
    answer, history,
    sessionSecs,
    toggleMic, generateAnswer,
    clear, resetSession,
    handleSpacebar,
  } = useInterview({
    ...config, userEmail,
    model:          settings.model,
    maxDelay:       settings.maxDelay,
    operatingPoint: settings.operatingPoint,
  });

  const { saveSession, saving, formatDuration } = useSession(userEmail);

  const handleSettingsClose = useCallback(() => {
    setSettingsOpen(false);
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleSpacebar);
    return () => window.removeEventListener("keydown", handleSpacebar);
  }, [handleSpacebar]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.code === "Escape" && !settingsOpen) { e.preventDefault(); clear(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [clear, settingsOpen]);

  const copyAnswer = useCallback(() => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [answer]);

  const endSession = useCallback(async () => {
    await saveSession({
      companyName: config.companyName, role: config.role,
      resume: config.resume, turns: history, durationSecs: sessionSecs,
    });
    resetSession();
    router.push("/real-interview");
  }, [saveSession, config, history, sessionSecs, resetSession, router]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Smart resume display
  const cleanResume = (t: string) => {
    if (!t) return "No resume loaded";
    const cleaned = t.replace(/[^\x20-\x7E\n]/g, " ").replace(/  +/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    const ratio = (cleaned.match(/[a-zA-Z]/g) || []).length / Math.max(cleaned.length, 1);
    if (ratio < 0.3) return "Resume uploaded.\nText preview unavailable.\n\nUse Paste tab on setup screen for best display.";
    return cleaned.slice(0, 800);
  };

  const qCount      = history.filter(t => t.role === "interviewer").length;
  const aCount      = history.filter(t => t.role === "candidate").length;
  const activeModel = MODELS.find(m => m.id === settings.model) || MODELS[0];

  const isActive    = isRecording || isGenerating;
  const stateColor  = isGenerating ? "#f97316" : isRecording ? "#22c55e" : "#334155";
  const stateLabel  = isGenerating ? "THINKING"  : isRecording ? "LISTENING" : "READY";
  const stateBg     = isGenerating ? "rgba(249,115,22,0.08)"  : isRecording ? "rgba(34,197,94,0.08)"  : "rgba(255,255,255,0.03)";
  const stateBorder = isGenerating ? "rgba(249,115,22,0.2)"   : isRecording ? "rgba(34,197,94,0.2)"   : "rgba(255,255,255,0.07)";

  return (
    <div className="h-screen flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #030308 0%, #07070f 50%, #030308 100%)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.025]"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />
        <div className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
      </div>

      <SettingsDrawer open={settingsOpen} onClose={handleSettingsClose} />

      {/* ═══════════════ TOP NAV ═══════════════ */}
      <nav className="h-[56px] flex items-center justify-between px-5 shrink-0 z-30 border-b border-white/[0.05]"
        style={{ background: "rgba(3,3,8,0.95)", backdropFilter: "blur(24px)" }}>

        <div className="flex items-center gap-3">
          <button onClick={endSession}
            className="w-8 h-8 rounded-xl border flex items-center justify-center text-white/25 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
            <ArrowLeft size={14} />
          </button>

          <div className="h-4 w-px bg-white/[0.07]" />

          {/* Status pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all"
            style={{ background: stateBg, borderColor: stateBorder }}>
            <motion.div
              animate={{
                backgroundColor: stateColor,
                boxShadow: isActive ? [`0 0 0 0 ${stateColor}55`, `0 0 0 5px ${stateColor}00`] : "none",
              }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: stateColor }}
            />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: stateColor }}>
              {stateLabel}
            </span>
          </div>

          {(config.role || config.companyName) && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-3 w-px bg-white/[0.08]" />
              <span className="text-[12px] font-medium text-white/35 max-w-[200px] truncate">
                {[config.role, config.companyName].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
            <Clock size={11} className="text-white/20" />
            <span className="font-mono text-[12px] font-black text-white/50 tabular-nums">
              {formatTime(sessionSecs)}
            </span>
          </div>

          {/* Model */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
            style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.15)" }}>
            <Zap size={10} className="text-indigo-400/70" />
            <span className="text-[10px] font-black text-indigo-400/70 uppercase tracking-wider">
              {activeModel.label}
            </span>
          </div>

          <button onClick={copyAnswer} disabled={!answer}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
              !answer ? "opacity-30 cursor-not-allowed" :
              copied  ? "text-green-400" : "text-white/30 hover:text-white/70"
            }`}
            style={{
              background: copied ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.02)",
              borderColor: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)",
            }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>

          <button onClick={clear}
            className="w-8 h-8 rounded-lg border flex items-center justify-center text-white/25 hover:text-white/60 transition-all"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
            <RotateCcw size={12} />
          </button>

          <button onClick={() => setSettingsOpen(true)}
            className="w-8 h-8 rounded-lg border flex items-center justify-center text-white/25 hover:text-white/60 transition-all"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
            <Settings size={12} />
          </button>

          <button onClick={endSession} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-40"
            style={{ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.2)", color: "rgba(248,113,113,0.8)" }}>
            <PhoneOff size={11} />
            {saving ? "Saving..." : "End"}
          </button>
        </div>
      </nav>

      {/* ═══════════════ INTERVIEWER TRANSCRIPT ═══════════════ */}
      {/* Large visible card — not a thin bar */}
      <div className="shrink-0 border-b border-white/[0.05] px-5 py-4"
        style={{ background: "rgba(0,0,0,0.4)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-4 p-4 rounded-2xl border"
            style={{ background: "rgba(99,102,241,0.04)", borderColor: "rgba(99,102,241,0.12)" }}>
            {/* Label */}
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              <PulseBars active={!!(transcript || partial)} color="#818cf8" />
              <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.25em] whitespace-nowrap">
                Interviewer
              </span>
            </div>
            <div className="w-px h-5 bg-indigo-500/20 shrink-0 mt-0.5" />
            {/* Transcript text — full size, readable */}
            <div className="flex-1 min-h-[24px]">
              <p className="text-[14px] text-white/70 leading-relaxed font-medium">
                {transcript && (
                  <span>{transcript.length > 200 ? "…" + transcript.slice(-200) : transcript}</span>
                )}
                {partial && (
                  <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}
                    className="text-indigo-300 font-semibold">
                    {transcript ? " " : ""}{partial}
                  </motion.span>
                )}
                {!transcript && !partial && (
                  <span className="text-white/20 italic text-[13px]">
                    Waiting for voice input — press SPACE to start listening...
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ MAIN LAYOUT ═══════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-52 border-r border-white/[0.04] p-5 hidden xl:flex flex-col gap-6 shrink-0"
          style={{ background: "rgba(0,0,0,0.25)" }}>

          {/* Session stats */}
          <div>
            <p className="text-[9px] font-black text-white/15 uppercase tracking-[0.5em] mb-4">
              Session Stats
            </p>
            <div className="space-y-4">
              {[
                { label: "Questions", value: qCount,                     color: "text-indigo-400"  },
                { label: "Answers",   value: aCount,                     color: "text-violet-400"  },
                { label: "Duration",  value: formatDuration(sessionSecs), color: "text-white/40"   },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-[11px] text-white/25 font-medium">{label}</p>
                  <p className={`text-[18px] font-black font-mono ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="p-4 rounded-xl border"
            style={{ background: "rgba(99,102,241,0.04)", borderColor: "rgba(99,102,241,0.1)" }}>
            <div className="flex justify-between mb-2">
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Progress</p>
              <p className="text-[10px] font-mono text-indigo-400/60">{qCount}/10</p>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #4f46e5, #7c3aed)" }}
                animate={{ width: `${Math.min((qCount / 10) * 100, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Shortcuts */}
          <div className="mt-auto">
            <p className="text-[9px] font-black text-white/15 uppercase tracking-[0.5em] mb-3">
              Shortcuts
            </p>
            <div className="space-y-2.5">
              {[
                { key: "SPACE", desc: "Listen / Answer" },
                { key: "ESC",   desc: "Clear screen"   },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <kbd className="text-[10px] font-mono font-bold text-white/20 px-2 py-1 rounded-lg border border-white/[0.07]"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    {key}
                  </kbd>
                  <span className="text-[11px] text-white/20">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── CENTER — ANSWER AREA ── */}
        <main className="flex-1 flex flex-col overflow-hidden p-5 gap-4">

          {/* Tabs */}
          <div className="flex items-center gap-1 shrink-0 p-1 rounded-xl border border-white/[0.06]"
            style={{ background: "rgba(255,255,255,0.01)" }}>
            {([
              { id: "response", label: "Recommended Response", icon: BrainCircuit },
              { id: "history",  label: "Conversation History", icon: MessageSquare },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition-all ${
                  activeTab === id
                    ? "text-white border border-white/[0.08]"
                    : "text-white/25 hover:text-white/45"
                }`}
                style={activeTab === id ? { background: "rgba(99,102,241,0.1)" } : {}}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Answer card — takes all remaining space */}
          <div className="flex-1 rounded-2xl border border-white/[0.07] overflow-hidden flex flex-col"
            style={{ background: "rgba(6,6,14,0.95)" }}>

            {/* Card header */}
            <div className="h-10 flex items-center justify-between px-5 border-b border-white/[0.05] shrink-0"
              style={{ background: "rgba(0,0,0,0.3)" }}>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: isGenerating ? [1, 0.2, 1] : 0.2 }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                  className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                />
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.35em]">
                  {activeTab === "response" ? "AI Recommended Response" : "Full Conversation"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {answer && activeTab === "response" && (
                  <span className="text-[9px] text-white/20 font-mono uppercase">
                    {answer.includes("•") ? "Bullet Format" : "Direct Answer"}
                  </span>
                )}
              </div>
            </div>

            {/* Content — scrollable, large */}
            <div className="flex-1 overflow-y-auto px-6 py-2
              [&::-webkit-scrollbar]:w-[3px]
              [&::-webkit-scrollbar-thumb]:bg-indigo-500/20
              [&::-webkit-scrollbar-track]:bg-transparent">

              {activeTab === "response" ? (
                <AnswerRenderer
                  answer={answer}
                  isGenerating={isGenerating}
                  isRecording={isRecording}
                />
              ) : (
                <div className="space-y-4 py-4">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <MessageSquare size={28} className="text-white/[0.08]" />
                      <p className="text-[12px] text-white/20">No conversation yet</p>
                    </div>
                  ) : history.map((turn, i) => (
                    <div key={i} className={`flex ${turn.role === "candidate" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-[13px] leading-relaxed border`}
                        style={{
                          background: turn.role === "interviewer" ? "rgba(255,255,255,0.03)" : "rgba(99,102,241,0.08)",
                          borderColor: turn.role === "interviewer" ? "rgba(255,255,255,0.07)" : "rgba(99,102,241,0.18)",
                          color: turn.role === "interviewer" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.80)",
                        }}>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${
                          turn.role === "interviewer" ? "text-white/20" : "text-indigo-400/50"
                        }`}>
                          {turn.role === "interviewer" ? "Interviewer" : "You"}
                        </p>
                        {turn.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ── RIGHT SIDEBAR — RESUME ── */}
        <aside className="w-56 border-l border-white/[0.04] p-5 hidden xl:flex flex-col gap-4 shrink-0"
          style={{ background: "rgba(0,0,0,0.25)" }}>
          <div className="flex items-center gap-2">
            <FileText size={12} className="text-white/20" />
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">
              Resume Context
            </p>
          </div>
          {/* Resume displayed as a styled card */}
          <div className="flex-1 rounded-xl border border-white/[0.05] p-4 overflow-y-auto
            [&::-webkit-scrollbar]:w-[2px]
            [&::-webkit-scrollbar-thumb]:bg-white/[0.06]"
            style={{ background: "rgba(255,255,255,0.015)" }}>
            <p className="text-[10px] text-white/30 leading-relaxed font-mono whitespace-pre-wrap break-words">
              {cleanResume(config.resume)}
            </p>
          </div>
          <p className="text-[9px] text-white/[0.1] text-center">
            AI uses full resume for context
          </p>
        </aside>
      </div>

      {/* ═══════════════ FOOTER — MIC ═══════════════ */}
      <footer className="shrink-0 border-t border-white/[0.05] px-5 py-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">

          {/* Left hint */}
          <div className="hidden sm:flex flex-col gap-0.5 w-40">
            <p className="text-[11px] font-bold text-white/30">
              {isRecording ? "Stop & generate answer" : "Start listening"}
            </p>
            <p className="text-[10px] text-white/15 font-mono">
              {isRecording ? "Press SPACE or mic button" : "Press SPACE or tap mic"}
            </p>
          </div>

          {/* Center — mic button */}
          <div className="flex items-center gap-4 mx-auto">
            {/* Stop/clear button */}
            {(transcript || answer) && (
              <button onClick={clear}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-bold text-white/30 hover:text-white/60 transition-all"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <RotateCcw size={14} /> Clear
              </button>
            )}

            {/* Main mic button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={isRecording ? generateAnswer : toggleMic}
              disabled={isGenerating}
              className="relative flex items-center gap-3 px-8 py-3.5 rounded-2xl font-bold text-[14px] text-white disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
              style={isRecording ? {
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                boxShadow: "0 0 30px rgba(239,68,68,0.12)",
              } : {
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: "0 0 30px rgba(79,70,229,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              {isRecording && (
                <motion.div animate={{ opacity: [0.2, 0, 0.2] }} transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: "rgba(239,68,68,0.25)" }} />
              )}
              {isGenerating ? (
                <><Loader2 size={18} className="animate-spin" /> Generating answer...</>
              ) : isRecording ? (
                <><MicOff size={18} /> <span style={{ color: "#f87171" }}>Stop & Get Answer</span></>
              ) : (
                <><Mic size={18} /> Start Listening</>
              )}
            </motion.button>

            {/* Copy button when answer ready */}
            {answer && !isRecording && !isGenerating && (
              <button onClick={copyAnswer}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-bold transition-all ${
                  copied ? "text-green-400" : "text-white/30 hover:text-white/60"
                }`}
                style={{
                  background: copied ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.02)",
                  borderColor: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)",
                }}>
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
              </button>
            )}
          </div>

          {/* Right hint */}
          <div className="hidden sm:flex flex-col items-end gap-0.5 w-40">
            <p className="text-[11px] font-bold text-white/30">
              {isGenerating ? "Generating..." : answer ? "Answer ready" : "Waiting..."}
            </p>
            <p className="text-[10px] text-white/15 font-mono">
              ESC to clear screen
            </p>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
        * { -webkit-font-smoothing: antialiased; }
      `}} />
    </div>
  );
}