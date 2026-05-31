"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { getUserProfile, type PlanId } from "../lib/credits";
import AuthModal from "../../components/AuthModal";
import Link from "next/link";
import { PageHeader, PageFooter } from "../../components/PageShell";

// ─── Fade-in-up helper (same as homepage) ────────────────────────────────────
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function Check({ className = "" }) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${className}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}
function Dash() {
  return <span className="w-4 h-4 flex-shrink-0 mt-0.5 flex items-center justify-center text-gray-300 text-sm">–</span>;
}

// ─── PLAN DATA (real features from codebase) ──────────────────────────────────
const PLANS = [
  {
    id: "free" as PlanId,
    name: "Starter",
    tagline: "Try it risk-free",
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Start for free",
    ctaSecondary: "No credit card",
    badge: null,
    popular: false,
    gradient: false,
    usageNote: "100 one-time credits — never expires",
    forWho: "Perfect to try every feature and get a feel for how CoopilotX works in a real interview.",
    features: [
      { text: "Live interview copilot — real-time AI answers", highlight: false },
      { text: "Listen via mic, answer in under 2 seconds", highlight: false },
      { text: "Resume builder — build & download your resume", highlight: false },
      { text: "Mock interview practice — AI-generated questions", highlight: false },
      { text: "Works in any browser — no download needed", highlight: false },
      { text: "~6 mock sessions or ~50 min live help total", highlight: false, dimNote: true },
    ],
  },
  {
    id: "basic" as PlanId,
    name: "Basic",
    tagline: "For active job seekers",
    monthlyPrice: 12,
    annualPrice: 8,
    cta: "Get Basic",
    ctaSecondary: "Cancel anytime",
    badge: "Most popular",
    popular: true,
    gradient: true,
    usageNote: "1,000 credits refreshed every month",
    forWho: "You're actively interviewing and need a reliable edge — enough credits for a full month of serious prep.",
    features: [
      { text: "Everything in Starter", highlight: false },
      { text: "1,000 credits/month — about 66 mock sessions", highlight: true },
      { text: "Or ~500 minutes of live copilot time per month", highlight: true },
      { text: "AI resume tailoring — rewrite to match any job description", highlight: false },
      { text: "Windows & Mac desktop app — works off-screen", highlight: false },
      { text: "Sharper AI model — more detailed, natural-sounding answers", highlight: false },
      { text: "Credits reset every month", highlight: false },
    ],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    tagline: "No limits, ever",
    monthlyPrice: 29,
    annualPrice: 19,
    cta: "Get Pro",
    ctaSecondary: "7-day refund",
    badge: "Best value",
    popular: false,
    gradient: false,
    usageNote: "Unlimited — no credit tracking at all",
    forWho: "You're targeting top companies, interviewing every week, and want total confidence with zero restrictions.",
    features: [
      { text: "Everything in Basic", highlight: false },
      { text: "Unlimited live copilot — use it as much as you want", highlight: true },
      { text: "Unlimited mock interview sessions — practice every day", highlight: true },
      { text: "Camera stealth mode — overlay invisible even on camera", highlight: true },
      { text: "Session recordings — review every Q&A after the interview", highlight: true },
      { text: "Best AI model — most human-sounding, senior-level answers", highlight: false },
      { text: "Every future feature included automatically", highlight: false },
    ],
  },
];

// ─── COMPARISON (real features only) ─────────────────────────────────────────
const ROWS = [
  { cat: "Live Copilot",    label: "Real-time AI answers during interview", free: true,           basic: true,                  pro: true                  },
  { cat: "Live Copilot",    label: "Answer speed",                          free: "< 2 seconds",  basic: "< 2 seconds",         pro: "< 2 seconds"         },
  { cat: "Live Copilot",    label: "Live copilot allowance",                free: "~50 min total",basic: "~500 min / month",    pro: "Unlimited"           },
  { cat: "Live Copilot",    label: "Works on Zoom, Teams, Meet, any call",  free: true,           basic: true,                  pro: true                  },
  { cat: "Live Copilot",    label: "Camera stealth (invisible on camera)",  free: false,          basic: false,                 pro: true                  },
  { cat: "Mock Interviews", label: "AI mock interview sessions",            free: "~6 total",     basic: "~66 / month",         pro: "Unlimited"           },
  { cat: "Mock Interviews", label: "Questions tailored to your role & JD",  free: true,           basic: true,                  pro: true                  },
  { cat: "Mock Interviews", label: "Session recordings & review",           free: false,          basic: false,                 pro: true                  },
  { cat: "Resume",          label: "Resume builder",                        free: true,           basic: true,                  pro: true                  },
  { cat: "Resume",          label: "AI resume tailoring for job description",free: false,         basic: true,                  pro: true                  },
  { cat: "App",             label: "Web browser (no install)",              free: true,           basic: true,                  pro: true                  },
  { cat: "App",             label: "Windows desktop app",                   free: false,          basic: true,                  pro: true                  },
  { cat: "App",             label: "macOS desktop app",                     free: false,          basic: true,                  pro: true                  },
  { cat: "AI Quality",      label: "AI model quality",                      free: "Standard",     basic: "Enhanced",            pro: "Best"                },
  { cat: "Support",         label: "Email support",                         free: true,           basic: true,                  pro: true                  },
  { cat: "Support",         label: "Priority support + new features",       free: false,          basic: false,                 pro: true                  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is the live copilot, exactly?",
    a: "During your real interview, CoopilotX listens to the interviewer through your mic, reads your resume, and streams a suggested answer to your screen in under 2 seconds — completely invisible to them. You hear the question, glance at the answer, and respond naturally. It works on Zoom, Google Meet, Teams, phone calls, and even in-person.",
  },
  {
    q: "What are credits and how do they work?",
    a: "Credits are how usage is measured. Every action has a small cost: live copilot costs 2 credits per minute, a mock interview session costs 15 credits. Starter gets 100 one-time credits (~50 min live help or ~6 sessions). Basic gets 1,000 credits refreshed every month. Pro has no credit limit at all — just use it.",
  },
  {
    q: "Is it detectable on screen-share?",
    a: "No. The app runs as a separate window that is excluded from screen-share. On Zoom, Teams, Meet, and similar platforms, it is completely invisible to the interviewer. Pro's camera stealth mode goes further — the overlay is hidden even if the interviewer can see your physical screen.",
  },
  {
    q: "Do I need to upload a resume?",
    a: "No — you can start any session without a resume. Without one, the AI gives solid general answers. With your resume, every answer references your real experience, projects, and skills — which is far more convincing to interviewers.",
  },
  {
    q: "Can I cancel or change plans anytime?",
    a: "Yes. Cancel from your account settings with one click. You keep full access until the end of your billing period. Upgrades take effect immediately. Downgrades take effect next cycle.",
  },
  {
    q: "Is my resume and interview data private?",
    a: "Yes. Your resume text is only used during your session and is never stored permanently on our servers. Interview audio is processed on your device — raw audio is never sent anywhere. We do not sell your data or use it to train AI models.",
  },
  {
    q: "What if I want a refund?",
    a: "We offer a full 7-day refund on your first paid subscription. Email support@coopilotxai.com and we will sort it out — no forms, no questions.",
  },
];

// ─── Cell ─────────────────────────────────────────────────────────────────────
function Cell({ val, accent }: { val: boolean | string; accent?: boolean }) {
  if (val === false) return <div className="flex justify-center"><Dash /></div>;
  if (val === true) return (
    <div className="flex justify-center">
      <Check className={accent ? "text-violet-600" : "text-emerald-500"} />
    </div>
  );
  return (
    <p className={`text-center text-xs font-semibold ${accent ? "text-violet-700" : "text-gray-600"}`}>{val}</p>
  );
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group">
        <span className="font-semibold text-gray-800 text-sm group-hover:text-violet-700 transition-colors">{q}</span>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <p className="text-sm text-gray-500 leading-relaxed pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [user,     setUser]     = useState<any>(null);
  const [profile,  setProfile]  = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading,  setLoading]  = useState<string | null>(null);
  const [annual,   setAnnual]   = useState(false);
  const [showAll,  setShowAll]  = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) { const p = await getUserProfile(u.uid); setProfile(p); }
    });
    return () => unsub();
  }, []);

  const handleCheckout = async (planId: "basic" | "pro") => {
    if (!user) { setShowAuth(true); return; }
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, annual, uid: user.uid, email: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* swallow */ }
    setLoading(null);
  };

  const currentPlan = profile?.plan as PlanId | undefined;
  const visibleRows = showAll ? ROWS : ROWS.slice(0, 9);

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {showAuth && <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />}
      <PageHeader />

      {/* ══════════ HERO ══════════════════════════════════════════════════════ */}
      <section className="relative pt-20 pb-16 px-6 text-center overflow-hidden"
        style={{ background: "linear-gradient(150deg, #faf8ff 0%, #f4edff 40%, #fff4ec 75%, #fdf8ff 100%)" }}>

        {/* Ambient blobs — same as homepage */}
        <div className="absolute pointer-events-none top-0 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)", filter: "blur(80px)", transform: "translateX(-50%)" }} />
        <div className="absolute pointer-events-none top-0 right-0 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(234,88,12,0.10) 0%, transparent 65%)", filter: "blur(70px)" }} />

        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.05) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative max-w-3xl mx-auto z-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-violet-200/70 shadow-sm backdrop-blur-sm mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
            </span>
            <span className="text-[11px] font-semibold text-gray-600 tracking-wide">Simple pricing · Cancel anytime</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}
            className="text-4xl md:text-[3.2rem] font-black tracking-tight leading-[1.08] text-gray-900 mb-4">
            One offer pays for<br />
            <span style={{ background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 45%, #ea580c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              years of subscriptions.
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
            className="text-gray-500 text-[1.05rem] leading-relaxed mb-8 max-w-xl mx-auto">
            CoopilotX listens during your real interview and streams the perfect answer to your screen in under 2 seconds — completely invisible to the interviewer.
          </motion.p>

          {/* Trust bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400 mb-10">
            {[
              "Secure checkout via Stripe",
              "Cancel anytime",
              "7-day money-back guarantee",
              "Audio never stored",
            ].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t}
              </span>
            ))}
          </motion.div>

          {/* Billing toggle */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="inline-flex items-center bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full p-1 shadow-sm gap-1">
            <button onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Monthly
            </button>
            <button onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Annual
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                Save 33%
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* ══════════ PLAN CARDS ════════════════════════════════════════════════ */}
      <section className="relative px-6 pb-24"
        style={{ background: "linear-gradient(180deg, #fdf8ff 0%, #ffffff 40%)" }}>
        <div className="max-w-6xl mx-auto -mt-4">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan, i) => {
              const price = annual ? plan.annualPrice : plan.monthlyPrice;
              const isCurrent = currentPlan === plan.id;
              const savings = plan.monthlyPrice > 0
                ? (plan.monthlyPrice - plan.annualPrice) * 12 : 0;

              return (
                <motion.div key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative rounded-2xl flex flex-col ${
                    plan.popular
                      ? "shadow-2xl shadow-violet-200/60 ring-2 ring-violet-500/20"
                      : "shadow-sm"
                  }`}
                  style={plan.popular
                    ? { background: "linear-gradient(160deg, #faf7ff 0%, #f3ecff 50%, #fff7f3 100%)", border: "1px solid rgba(124,58,237,0.2)" }
                    : { background: "#fff", border: "1px solid #e5e7eb" }
                  }
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-4 py-1 rounded-full text-white shadow-sm`}
                      style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)" }}>
                      {plan.badge}
                    </div>
                  )}

                  {/* Top gradient line */}
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                      style={{ background: "linear-gradient(90deg, #6d28d9, #9333ea, #ea580c)" }} />
                  )}

                  <div className="p-7 pb-5">
                    {/* Name + tagline */}
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-1"
                      style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                      {plan.tagline}
                    </p>
                    <h2 className="text-2xl font-black text-gray-900 mb-5">{plan.name}</h2>

                    {/* Price */}
                    <div className="mb-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black text-gray-900 tracking-tight">
                          {price === 0 ? "Free" : `$${price}`}
                        </span>
                        {price > 0 && (
                          <span className="text-sm text-gray-400">/ month</span>
                        )}
                      </div>
                      {annual && savings > 0 && (
                        <p className="text-xs mt-1 font-semibold text-emerald-600">
                          Billed ${plan.annualPrice * 12}/yr — you save ${savings}
                        </p>
                      )}
                      {price === 0 && (
                        <p className="text-xs mt-1 text-gray-400">No credit card required</p>
                      )}
                    </div>

                    {/* Usage note */}
                    <div className="mt-3 mb-4 px-3 py-2 rounded-lg text-[11px] font-semibold"
                      style={{ background: "rgba(109,40,217,0.06)", border: "1px solid rgba(109,40,217,0.12)", color: "#6d28d9" }}>
                      {plan.usageNote}
                    </div>

                    {/* Who it's for */}
                    <p className="text-sm text-gray-500 leading-relaxed mb-6 pt-3 border-t border-gray-100">
                      {plan.forWho}
                    </p>

                    {/* CTA */}
                    {plan.id === "free" ? (
                      <button onClick={() => !user && setShowAuth(true)}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                          isCurrent || user
                            ? "bg-gray-100 text-gray-400 cursor-default"
                            : "bg-gray-900 hover:bg-gray-700 text-white"
                        }`}>
                        {isCurrent ? "Current plan" : user ? "You're on this plan" : plan.cta}
                      </button>
                    ) : (
                      <button onClick={() => handleCheckout(plan.id as "basic" | "pro")}
                        disabled={!!loading || isCurrent}
                        className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-lg"
                        style={{ background: isCurrent ? "#d1d5db" : "linear-gradient(135deg, #6d28d9, #9333ea, #ea580c)", boxShadow: isCurrent ? "none" : "0 4px 20px rgba(109,40,217,0.3)" }}>
                        {isCurrent ? "Current plan" : loading === plan.id ? "Redirecting…" : plan.cta}
                      </button>
                    )}
                    <p className="text-center text-[10px] text-gray-400 mt-2">{plan.ctaSecondary}</p>
                  </div>

                  {/* Feature list */}
                  <div className="px-7 py-5 flex-1 border-t border-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">What's included</p>
                    <ul className="space-y-3">
                      {plan.features.map((f, fi) => (
                        <li key={fi} className={`flex items-start gap-2.5 ${(f as any).dimNote ? "opacity-60" : ""}`}>
                          <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${f.highlight ? "text-violet-600" : "text-gray-400"}`}
                            viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className={`text-sm leading-snug ${f.highlight ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                            {f.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="h-6" />
                </motion.div>
              );
            })}
          </div>

          {/* Annual note */}
          {!annual && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-center text-sm text-gray-400 mt-6">
              Save 33% with annual billing —{" "}
              <button onClick={() => setAnnual(true)} className="text-violet-600 font-semibold hover:underline">switch to annual</button>
            </motion.p>
          )}
        </div>
      </section>

      {/* ══════════ HOW CREDITS WORK ══════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">How your credits work</h2>
            <p className="text-gray-500 text-sm max-w-lg mx-auto">Credits are just a simple way to measure usage — here's exactly what each thing costs.</p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { action: "Live copilot", cost: "2 credits / min", note: "AI listens & answers in real-time", icon: "🎤", color: "rgba(109,40,217,0.07)", border: "rgba(109,40,217,0.15)", textColor: "#6d28d9" },
                { action: "Mock interview session", cost: "15 credits", note: "Full AI-powered practice session", icon: "💬", color: "rgba(234,88,12,0.07)", border: "rgba(234,88,12,0.15)", textColor: "#ea580c" },
                { action: "AI resume tailoring", cost: "20 credits", note: "Rewrite resume for a specific job", icon: "📄", color: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.15)", textColor: "#059669" },
                { action: "Resume verification", cost: "Free", note: "Check AI reads your resume correctly", icon: "✅", color: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.15)", textColor: "#4f46e5" },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl p-5"
                  style={{ background: item.color, border: `1px solid ${item.border}` }}>
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <p className="text-sm font-bold text-gray-800 mb-1">{item.action}</p>
                  <p className="text-lg font-black mb-1" style={{ color: item.textColor }}>{item.cost}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.note}</p>
                </div>
              ))}
            </div>
          </FadeUp>

          <FadeUp delay={0.15} className="mt-6">
            <div className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.1), rgba(234,88,12,0.08))" }}>
                <span className="text-lg">⚡</span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="font-bold text-gray-900 text-sm">Pro plan: no credits, no limits</p>
                <p className="text-xs text-gray-500 mt-0.5">Pro users bypass the credit system entirely. Use the live copilot, mock interviews, and resume tools as much as you want — no tracking, no caps.</p>
              </div>
              <button onClick={() => handleCheckout("pro")}
                className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)", boxShadow: "0 4px 16px rgba(109,40,217,0.25)" }}>
                Get Pro
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══════════ COMPARISON TABLE ══════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Full plan comparison</h2>
            <p className="text-gray-500 text-sm">Every feature, side by side — no surprises.</p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
              {/* Header */}
              <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200">
                <div className="px-6 py-4" />
                {[
                  { name: "Starter", price: "Free", accent: false },
                  { name: "Basic", price: annual ? "$8/mo" : "$12/mo", accent: true },
                  { name: "Pro", price: annual ? "$19/mo" : "$29/mo", accent: false },
                ].map(({ name, price, accent }, i) => (
                  <div key={i} className={`px-4 py-4 text-center border-l border-gray-200 ${accent ? "bg-violet-50/60" : ""}`}>
                    <p className={`text-sm font-black ${accent ? "text-violet-700" : "text-gray-900"}`}>{name}</p>
                    <p className={`text-xs mt-0.5 font-semibold ${accent ? "text-violet-500" : "text-gray-400"}`}>{price}</p>
                  </div>
                ))}
              </div>

              {/* Rows */}
              {(() => {
                let lastCat = "";
                return visibleRows.map((row, i) => {
                  const showCat = row.cat !== lastCat;
                  lastCat = row.cat;
                  return (
                    <div key={i}>
                      {showCat && (
                        <div className="grid grid-cols-4 bg-gray-50/50 border-b border-gray-100">
                          <div className="px-6 py-2 col-span-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{row.cat}</span>
                          </div>
                        </div>
                      )}
                      <div className={`grid grid-cols-4 border-b border-gray-50 hover:bg-gray-50/40 transition-colors ${i === visibleRows.length - 1 && showAll ? "border-0" : ""}`}>
                        <div className="px-6 py-3.5">
                          <span className="text-sm text-gray-600">{row.label}</span>
                        </div>
                        <div className="px-4 py-3.5 border-l border-gray-100 flex items-center justify-center">
                          <Cell val={row.free} />
                        </div>
                        <div className="px-4 py-3.5 border-l border-gray-100 bg-violet-50/25 flex items-center justify-center">
                          <Cell val={row.basic} accent />
                        </div>
                        <div className="px-4 py-3.5 border-l border-gray-100 flex items-center justify-center">
                          <Cell val={row.pro} />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Show more */}
              <div className="border-t border-gray-100">
                <button onClick={() => setShowAll(!showAll)}
                  className="w-full py-4 text-sm font-semibold text-violet-600 hover:text-violet-800 hover:bg-violet-50/40 transition-colors flex items-center justify-center gap-2">
                  {showAll ? "Show less" : `Show all ${ROWS.length} features`}
                  <motion.svg animate={{ rotate: showAll ? 180 : 0 }} transition={{ duration: 0.2 }}
                    className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══════════ GUARANTEE ═════════════════════════════════════════════════ */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <FadeUp>
            <div className="rounded-2xl overflow-hidden shadow-sm"
              style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.05), rgba(234,88,12,0.04))", border: "1px solid rgba(109,40,217,0.12)" }}>
              <div className="px-8 py-8 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)" }}>
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 mb-1">7-day money-back guarantee</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Not satisfied within 7 days? Email{" "}
                    <a href="mailto:support@coopilotxai.com" className="font-semibold hover:underline" style={{ color: "#6d28d9" }}>
                      support@coopilotxai.com
                    </a>{" "}
                    and we'll refund you in full — no questions, no forms, no waiting.
                  </p>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══════════ FAQ ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Common questions</h2>
            <p className="text-gray-500 text-sm">Everything you need to know before signing up.</p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="bg-white rounded-2xl border border-gray-200 px-8 shadow-sm">
              {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
            </div>
            <p className="text-center text-sm text-gray-400 mt-6">
              Still have questions?{" "}
              <a href="mailto:support@coopilotxai.com" className="text-violet-600 font-semibold hover:underline">
                Email us
              </a>{" "}
              — we reply same day.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ══════════ BOTTOM CTA ════════════════════════════════════════════════ */}
      <section className="py-24 px-6 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #faf8ff 0%, #f4edff 40%, #fff4ec 75%, #fdf8ff 100%)" }}>

        {/* Blobs */}
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[300px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(109,40,217,0.10) 0%, transparent 70%)", filter: "blur(60px)" }} />
        </div>
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.05) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative max-w-xl mx-auto z-10">
          <FadeUp>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight leading-tight">
              Your next interview is<br />
              <span style={{ background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 45%, #ea580c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                your best interview.
              </span>
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              Start for free. No credit card. No commitment. See exactly how it works — then decide.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => !user && setShowAuth(true)}
                className="px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-lg"
                style={{ background: "linear-gradient(135deg, #6d28d9, #9333ea, #ea580c)", boxShadow: "0 6px 24px rgba(109,40,217,0.3)" }}>
                Start for free
              </button>
              <Link href="/real-interview"
                className="px-8 py-3.5 rounded-xl border border-gray-200 bg-white hover:border-violet-300 text-gray-700 hover:text-violet-700 font-semibold text-sm transition-all">
                Try live copilot now →
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 mt-8 text-[11px] text-gray-400">
              {["50,000+ interviews assisted", "87% offer rate", "< 2s answer speed", "100% private"].map((s, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-violet-400" />
                  {s}
                </span>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      <PageFooter />
    </div>
  );
}
