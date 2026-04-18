"use client";

// app/real-interview/page.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Zap, BarChart2, Shield, Sparkles,
  ArrowRight, TrendingUp, Clock, Star,
  BrainCircuit, Coins, Flame,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import AuthModal from "../../components/AuthModal";
import SetupForm from "./_components/SetupForm";

export type InterviewConfig = {
  resume:         string;
  jobDescription: string;
  companyName:    string;
  role:           string;
};

// ─────────────────────────────────────────────
// SANITIZE
// ─────────────────────────────────────────────
function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "•")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E\n\r\t•]/g, " ")
    .replace(/  +/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─────────────────────────────────────────────
// CREDITS DISPLAY
// ─────────────────────────────────────────────
function CreditsDisplay({
  credits, plan, loading, onUpgrade,
}: {
  credits: number; plan: string;
  loading: boolean; onUpgrade: () => void;
}) {
  const isPro   = plan === "pro";
  const isLow   = !isPro && credits <= 10;
  const isEmpty = !isPro && credits <= 0;

  if (loading) return (
    <div className="h-7 w-28 rounded-lg bg-white/[0.04] animate-pulse border border-white/[0.06]" />
  );

  if (isPro) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
      style={{ background: "rgba(251,191,36,0.07)", borderColor: "rgba(251,191,36,0.2)" }}>
      <Sparkles size={11} className="text-amber-400" />
      <span className="text-[11px] font-black text-amber-400 uppercase tracking-[0.15em]">
        Pro · Unlimited
      </span>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
        isEmpty ? "border-red-500/20"    :
        isLow   ? "border-orange-500/20" :
                  "border-white/[0.07]"
      }`} style={{
        background: isEmpty ? "rgba(239,68,68,0.06)"    :
                    isLow   ? "rgba(249,115,22,0.06)"   :
                              "rgba(255,255,255,0.02)",
      }}>
        <Coins size={10} className={isEmpty ? "text-red-400" : isLow ? "text-orange-400" : "text-white/25"} />
        <span className={`text-[11px] font-black ${
          isEmpty ? "text-red-400" : isLow ? "text-orange-400" : "text-white/45"
        }`}>
          {credits.toLocaleString()}
          <span className="font-normal text-[10px] ml-1 opacity-60">credits</span>
        </span>
        {isLow && (
          <div className="flex items-center gap-1">
            <Flame size={9} className={isEmpty ? "text-red-400" : "text-orange-400"} />
            <span className={`text-[9px] font-black ${isEmpty ? "text-red-400" : "text-orange-400"}`}>
              {isEmpty ? "Empty" : "Low"}
            </span>
          </div>
        )}
      </div>
      {(isLow || isEmpty) && (
        <button onClick={onUpgrade}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white transition-all"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
          Upgrade
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function RealInterviewPage() {
  const router                              = useRouter();
  const [user, setUser]                     = useState<any>(null);
  const [authLoading, setLoading]           = useState(true);
  const [showAuth, setShowAuth]             = useState(false);
  const [credits, setCredits]               = useState<number>(0);
  const [plan, setPlan]                     = useState<string>("free");
  const [creditsLoading, setCreditsLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (!u) { setShowAuth(true); return; }
      setCreditsLoading(true);
      try {
        const q    = query(collection(db, "users"), where("email", "==", u.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setCredits(data.credits ?? 0);
          setPlan(data.plan ?? "free");
        }
      } catch (err) { console.error("Credits load error:", err); }
      setCreditsLoading(false);
    });
    return unsub;
  }, []);

  const handleStart = (cfg: InterviewConfig) => {
    sessionStorage.setItem("interviewConfig", JSON.stringify({
      ...cfg,
      resume:         sanitizeText(cfg.resume),
      jobDescription: sanitizeText(cfg.jobDescription),
    }));
    router.push("/real-interview/interview");
  };

  const handleStealth = (cfg: InterviewConfig) => {
    const cleanResume = sanitizeText(cfg.resume);
    const cleanJd     = sanitizeText(cfg.jobDescription);
    sessionStorage.setItem("interviewConfig", JSON.stringify({
      ...cfg, resume: cleanResume, jobDescription: cleanJd,
    }));
    const params = new URLSearchParams({
      resume:  cleanResume.slice(0, 8000),
      jd:      cleanJd.slice(0, 2000),
      company: cfg.companyName,
      role:    cfg.role,
    });
    window.open(
      `/real-interview/popup?${params}`,
      "InterviewCopilot",
      [
        "width=560", "height=580", "top=8",
        `left=${Math.round((window.screen.width - 560) / 2)}`,
        "toolbar=no", "menubar=no", "scrollbars=no",
        "resizable=no", "status=no",
      ].join(",")
    );
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #030308 0%, #07070f 50%, #030308 100%)" }}>
      <Loader2 className="w-8 h-8 text-indigo-500/50 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen text-white overflow-x-hidden"
      style={{
        background: "linear-gradient(135deg, #030308 0%, #07070f 50%, #030308 100%)",
        fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
      }}>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full opacity-[0.025]"
          style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {!user ? (
        /* ── NOT SIGNED IN ── */
        <div className="relative flex flex-col items-center justify-center min-h-screen gap-8 p-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border"
              style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.2)" }}>
              <Shield size={26} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Sign in to continue</h1>
              <p className="text-white/30 text-sm max-w-xs mx-auto">
                Access Interview Copilot and start your session.
              </p>
            </div>
            <button onClick={() => setShowAuth(true)}
              className="px-8 py-3 rounded-xl font-bold text-white transition-all text-sm"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              Sign In
            </button>
          </motion.div>
        </div>

      ) : (
        <div className="relative">

          {/* ════════════════ NAVBAR ════════════════ */}
          <nav className="sticky top-0 z-50 border-b border-white/[0.04]"
            style={{ background: "rgba(3,3,8,0.85)", backdropFilter: "blur(24px)" }}>
            <div className="max-w-[1400px] mx-auto px-6 h-[60px] flex items-center justify-between">

              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                    <BrainCircuit size={18} className="text-white" />
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2"
                    style={{ borderColor: "#030308" }} />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[15px] font-bold tracking-tight text-white/95">InterviewOS</span>
                  <span className="text-[10px] text-white/30 font-medium tracking-widest uppercase">Real Interview Suite</span>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-3">
                <CreditsDisplay
                  credits={credits} plan={plan}
                  loading={creditsLoading}
                  onUpgrade={() => router.push("/pricing")}
                />
                <div className="w-px h-4 bg-white/[0.08]" />
                <button onClick={() => router.push("/real-interview/dashboard")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/30 hover:text-white/60 transition-all border border-white/[0.06] hover:border-white/10"
                  style={{ background: "rgba(255,255,255,0.02)" }}>
                  <BarChart2 size={12} /> Sessions
                </button>
              </div>
            </div>
          </nav>

          {/* ════════════════ CONTENT ════════════════ */}
          <div className="max-w-[1400px] mx-auto px-6 py-8">
            <div className="grid lg:grid-cols-[1fr_400px] gap-8 max-w-5xl mx-auto">

              {/* ── LEFT ── */}
              <div className="space-y-5">

                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mb-6"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 border"
                    style={{ background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Real-Time AI Interview Copilot
                  </div>
                  <h1 className="text-[2.2rem] font-black tracking-tight leading-none mb-3 text-white/95">
                    Configure Your<br />
                    <span style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      Interview Session
                    </span>
                  </h1>
                  <p className="text-white/35 text-sm leading-relaxed max-w-md">
                    Upload your resume, paste the job description, and get AI-generated
                    answers tailored to your exact experience — in real time.
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-6 mt-6">
                    {[
                      { icon: TrendingUp, label: "Real-time",   value: "< 2s"         },
                      { icon: Star,       label: "Accuracy",    value: "Resume-based"  },
                      { icon: Clock,      label: "Duration",    value: "Unlimited"     },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-2">
                        <Icon size={11} className="text-white/15" />
                        <span className="text-[11px] text-white/25">{label}:</span>
                        <span className="text-[11px] font-semibold text-white/45">{value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Setup form */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <SetupForm
                    onStart={handleStart}
                    onDashboard={() => router.push("/real-interview/dashboard")}
                    onStealth={handleStealth}
                  />
                </motion.div>
              </div>

              {/* ── RIGHT SIDEBAR ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="space-y-4 lg:pt-[120px]"
              >

                {/* How it works */}
                <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.015)" }}>
                  <div className="px-5 py-4 border-b border-white/[0.05]">
                    <p className="text-xs font-bold text-white/30 uppercase tracking-widest">How it works</p>
                  </div>
                  <div className="p-5 space-y-4">
                    {[
                      {
                        step: "01", title: "Upload Resume",
                        desc: "Paste or upload your resume. AI reads your real experience.",
                        color: "text-indigo-400", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.2)",
                      },
                      {
                        step: "02", title: "Start Session",
                        desc: "Press SPACE to listen. AI captures what the interviewer says.",
                        color: "text-violet-400", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)",
                      },
                      {
                        step: "03", title: "Get Answer",
                        desc: "Press SPACE again. AI generates a perfect answer instantly.",
                        color: "text-emerald-400", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)",
                      },
                    ].map(({ step, title, desc, color, bg, border }) => (
                      <div key={step} className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                          style={{ background: bg, borderColor: border }}>
                          <span className={`text-[10px] font-black font-mono ${color}`}>{step}</span>
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white/80 mb-0.5">{title}</p>
                          <p className="text-[11px] text-white/30 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Credits breakdown */}
                <div className="rounded-2xl border border-white/[0.06] p-5"
                  style={{ background: "rgba(255,255,255,0.015)" }}>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Credits</p>
                  <div className="space-y-2.5">
                    {[
                      { label: "Real interview session", cost: "2 credits",  color: "text-indigo-400"  },
                      { label: "Resume verification",    cost: "Free",       color: "text-emerald-400" },
                      { label: "Stealth popup mode",     cost: "2 credits",  color: "text-violet-400"  },
                    ].map(({ label, cost, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-[12px] text-white/35">{label}</span>
                        <span className={`text-[11px] font-black font-mono ${color}`}>{cost}</span>
                      </div>
                    ))}
                  </div>
                  {plan !== "pro" && (
                    <button onClick={() => router.push("/pricing")}
                      className="w-full mt-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 border transition-all"
                      style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.12)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.06)"}
                    >
                      Upgrade to Pro — Unlimited <ArrowRight size={13} />
                    </button>
                  )}
                </div>

                {/* Shortcuts */}
                <div className="rounded-2xl border border-white/[0.06] p-5"
                  style={{ background: "rgba(255,255,255,0.015)" }}>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Shortcuts</p>
                  <div className="space-y-2">
                    {[
                      { key: "SPACE", desc: "Listen / Generate answer" },
                      { key: "ESC",   desc: "Clear current question"   },
                    ].map(({ key, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-[11px] text-white/30">{desc}</span>
                        <kbd className="text-[10px] font-mono font-bold text-white/30 px-2 py-1 rounded-lg border border-white/[0.08]"
                          style={{ background: "rgba(255,255,255,0.03)" }}>
                          {key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-center text-[10px] text-white/[0.12]">
                  Enterprise-grade · Data not stored
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
        * { -webkit-font-smoothing: antialiased; }
      `}} />
    </div>
  );
}