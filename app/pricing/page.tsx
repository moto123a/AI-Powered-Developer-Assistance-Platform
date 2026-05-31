"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { getUserProfile, type PlanId } from "../lib/credits";
import AuthModal from "../../components/AuthModal";
import Link from "next/link";
import { PageHeader, PageFooter } from "../../components/PageShell";

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
function CheckIcon({ accent = false }) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${accent ? "text-violet-600" : "text-emerald-500"}`}
      viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
    </svg>
  );
}
function DashIcon() {
  return <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-gray-300">–</span>;
}

// ─── PLANS ────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "free" as PlanId,
    name: "Starter",
    emoji: "🚀",
    tagline: "Try it, no card needed",
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Start for free",
    ctaNote: "No credit card required",
    badge: null,
    popular: false,
    usagePool: "100 one-time credits",
    usageBreakdown: "About 6 mock sessions or 50 minutes of live help",
    idealFor: "You have interviews coming up and want to see if CoopilotX gives you a real edge.",
    unlock: "Try the live copilot in a real interview for free.",
    features: [
      {
        icon: "🎤",
        title: "Live answers during real interviews",
        desc: "The AI listens through your mic. When the interviewer finishes talking, you press space. A full answer appears on your screen in under 2 seconds. The interviewer sees nothing on their end.",
        key: false,
      },
      {
        icon: "🧠",
        title: "Uses your actual experience",
        desc: "You upload your resume once. From that point every answer references your real background. Your actual job titles, your actual projects, your real skills. Not made up examples.",
        key: false,
      },
      {
        icon: "🎯",
        title: "Knows the role you are going for",
        desc: "You type in the company and the job title before you start. The AI adjusts every answer to match that specific role. An answer for a senior engineer sounds different to one for a junior.",
        key: false,
      },
      {
        icon: "🌐",
        title: "Works on any call or in person",
        desc: "Zoom, Google Meet, Teams, phone screens, even in person if you have a laptop open. Nothing to install for the browser version. Sign up and use it today.",
        key: false,
      },
      {
        icon: "💬",
        title: "Practice before the real interview",
        desc: "Run a full mock interview. The AI plays the interviewer, asks questions for your exact role, and responds to what you say back. You get a real feel for what to expect before it counts.",
        key: false,
      },
      {
        icon: "📄",
        title: "Resume builder included",
        desc: "Create a clean professional resume and download it as a PDF for free. No watermark, no upgrade wall.",
        key: false,
      },
      {
        icon: "✅",
        title: "Check the AI understood your resume",
        desc: "Before any interview you can run a quick check. The AI tells you what it read from your resume. If anything looks wrong you fix it before it matters. Always free.",
        key: false,
      },
      {
        icon: "🔒",
        title: "Your audio stays on your device",
        desc: "The microphone is processed locally. Nothing is recorded, nothing is sent to a server. No one else can hear your interviews.",
        key: false,
      },
    ],
    notIncluded: [
      "Desktop stealth app (screen-share exclusion)",
      "AI resume rewriting for job descriptions",
      "Session recordings and history",
    ],
  },
  {
    id: "basic" as PlanId,
    name: "Basic",
    emoji: "⚡",
    tagline: "For active job hunters",
    monthlyPrice: 12,
    annualPrice: 8,
    cta: "Get Basic",
    ctaNote: "Cancel anytime",
    badge: "Most popular",
    popular: true,
    usagePool: "1,000 credits / month",
    usageBreakdown: "About 66 mock sessions or 500 minutes of live help per month",
    idealFor: "You are actively applying to multiple roles and need a real advantage in every interview.",
    unlock: "Desktop app plus AI resume tailoring. The two features that change your odds.",
    features: [
      {
        icon: "🖥️",
        title: "The screen share problem is completely solved",
        desc: "When you share your screen on Zoom or Teams, the AI answer window is excluded at the operating system level. It does not show up in screen recordings. The interviewer cannot see it.",
        key: true,
      },
      {
        icon: "📋",
        title: "Your resume gets rewritten for every job",
        desc: "Paste a job description and your current resume. In about 30 seconds the AI rewrites your resume to match that role. Adds the right keywords and makes you look like the right candidate before a human even reads it.",
        key: true,
      },
      {
        icon: "💡",
        title: "Enough for a full month of active interviewing",
        desc: "1,000 credits a month works out to roughly 8 full hour-long interviews and 30 practice sessions. Resets every billing date. Most people never use all of it.",
        key: false,
      },
      {
        icon: "🎯",
        title: "Better answers to harder questions",
        desc: "This plan uses a stronger AI model. Behavioral questions like tell me about a time you dealt with conflict come out sounding natural and specific. Not like a list from a template.",
        key: false,
      },
      {
        icon: "🗂️",
        title: "Practice the actual questions you will be asked",
        desc: "Paste the job description before a mock session. The AI reads it and generates the specific questions that company typically asks for that role. You are practicing the real thing, not guessing.",
        key: false,
      },
      {
        icon: "🔁",
        title: "Credits reset every month",
        desc: "Your 1,000 credits come back on your billing date every month. Each month is a clean start.",
        key: false,
      },
      {
        icon: "✅",
        title: "Resume check is always free",
        desc: "Verifying that the AI read your resume correctly never costs credits on any plan.",
        key: false,
      },
      {
        icon: "💬",
        title: "Remembers what was said earlier in the session",
        desc: "The AI tracks the full conversation. If the interviewer asked about your database experience 10 minutes ago and asks a follow-up now, the answer connects back to what was already said.",
        key: false,
      },
    ],
    notIncluded: [
      "Camera stealth mode (visible on physical screen)",
      "Session recordings and post-interview review",
    ],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    emoji: "👑",
    tagline: "No limits. No compromises.",
    monthlyPrice: 29,
    annualPrice: 19,
    cta: "Get Pro",
    ctaNote: "7-day money-back guarantee",
    badge: "Best value",
    popular: false,
    usagePool: "Unlimited, no credits at all",
    usageBreakdown: "Use it every day, every interview, no counting",
    idealFor: "Targeting top companies or interviewing every week. Every advantage, no restrictions.",
    unlock: "Camera stealth plus session recordings plus unlimited use. The full toolkit.",
    features: [
      {
        icon: "♾️",
        title: "No limits at all",
        desc: "No credits, no timer, no cap. Use it in every interview, every day. There is nothing counting in the background. You never have to think about usage.",
        key: true,
      },
      {
        icon: "👁️",
        title: "Hidden even if someone looks at your screen physically",
        desc: "Camera stealth means the window disappears even if someone walks behind you or the interviewer asks you to show your physical screen. This goes beyond screen share protection which only works during digital sharing.",
        key: true,
      },
      {
        icon: "📼",
        title: "Every interview gets saved",
        desc: "When a session ends it is automatically saved. You can go back to any interview and see every question that was asked and exactly what the AI suggested as an answer.",
        key: true,
      },
      {
        icon: "🔍",
        title: "Spot what keeps coming up",
        desc: "After a few interviews you will notice certain topics come up again and again. Reviewing sessions helps you focus your preparation on what actually matters for the roles you are targeting.",
        key: false,
      },
      {
        icon: "🧠",
        title: "Handles the hard questions",
        desc: "System design rounds, case study interviews, FAANG level technical questions. The Pro model does noticeably better on these. If you are targeting senior roles or competitive companies this difference matters.",
        key: false,
      },
      {
        icon: "♾️",
        title: "Unlimited practice",
        desc: "No limit on mock sessions. Run the same question 20 times if you want. Nobody is counting.",
        key: false,
      },
      {
        icon: "🖥️",
        title: "Full desktop app with all protections",
        desc: "You get the screen share exclusion from Basic and camera stealth on top of it. Both active at the same time.",
        key: false,
      },
      {
        icon: "🎁",
        title: "Every new feature is automatically yours",
        desc: "New things we add show up in your account without any extra charge or upgrade needed.",
        key: false,
      },
    ],
    notIncluded: [],
  },
];

// ─── COMPARISON ROWS ──────────────────────────────────────────────────────────
const ROWS = [
  { cat: "Live Copilot",    label: "AI answers streamed in real-time",          free: true,              basic: true,            pro: true             },
  { cat: "Live Copilot",    label: "Answer speed",                              free: "< 2 seconds",     basic: "< 2 seconds",   pro: "< 2 seconds"    },
  { cat: "Live Copilot",    label: "Monthly live copilot allowance",            free: "~50 min (total)", basic: "~500 min/mo",   pro: "Unlimited"      },
  { cat: "Live Copilot",    label: "Works on Zoom, Teams, Meet, any call",      free: true,              basic: true,            pro: true             },
  { cat: "Live Copilot",    label: "Fully excluded from screen share",          free: "Browser only",    basic: "Desktop app ✓", pro: "Desktop app ✓"  },
  { cat: "Live Copilot",    label: "Camera stealth (hidden on physical screen)",free: false,             basic: false,           pro: true             },
  { cat: "Mock Practice",   label: "AI mock interview sessions",                free: "~6 total",        basic: "~66/month",     pro: "Unlimited"      },
  { cat: "Mock Practice",   label: "Questions tailored to your role & JD",      free: true,              basic: true,            pro: true             },
  { cat: "Mock Practice",   label: "Session recordings, review after",          free: false,             basic: false,           pro: true             },
  { cat: "Resume",          label: "Resume builder + PDF download",             free: true,              basic: true,            pro: true             },
  { cat: "Resume",          label: "Verify AI reads your resume (before session)", free: true,           basic: true,            pro: true             },
  { cat: "Resume",          label: "AI tailoring, rewrite for any job",         free: false,             basic: true,            pro: true             },
  { cat: "Apps",            label: "Web browser (no install needed)",           free: true,              basic: true,            pro: true             },
  { cat: "Apps",            label: "Windows desktop app",                       free: false,             basic: true,            pro: true             },
  { cat: "Apps",            label: "macOS desktop app",                         free: false,             basic: true,            pro: true             },
  { cat: "AI Quality",      label: "AI model",                                  free: "Standard",        basic: "Enhanced",      pro: "Best"           },
  { cat: "Billing",         label: "Credits reset",                             free: "One-time 100",    basic: "Monthly 1,000", pro: "No credits"     },
  { cat: "Billing",         label: "Future features included",                  free: false,             basic: false,           pro: true             },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What exactly is the live copilot?",
    a: "During your real interview, CoopilotX listens to the interviewer through your microphone, reads your resume, and streams a tailored answer directly to your screen in under 2 seconds. Completely invisible to the interviewer. You hear the question, glance at the answer, and respond naturally. It works on Zoom, Google Meet, Teams, phone calls, and in-person interviews.",
  },
  {
    q: "What are credits and how many do I need?",
    a: "Credits are a simple usage meter. Live copilot costs 2 credits per minute of active listening. A mock interview session costs 15 credits. Starter gives 100 total (about 50 min or 6 sessions). Basic gives 1,000 fresh credits every month (about 500 min or 66 sessions). Pro skips the credit system entirely. Unlimited use, no tracking.",
  },
  {
    q: "Why do I need the desktop app for full stealth?",
    a: "Browsers have limited ability to exclude windows from screen-share. It depends on the platform and browser version. The desktop app uses OS-level window exclusion that is 100% reliable. Zoom, Teams, Meet, and Webex all respect this flag. They cannot capture the overlay window. Camera stealth on Pro goes further. The overlay is hidden even if someone looks at your physical screen.",
  },
  {
    q: "Do I need to upload a resume to use it?",
    a: "No. You can start any session without a resume and the AI will still give solid general answers. But with your resume, every answer references your actual experience, specific projects, and real skills. Which sounds far more convincing to interviewers and completely avoids making things up.",
  },
  {
    q: "What does AI resume tailoring actually do?",
    a: "You paste a job description and your existing resume. The AI rewrites your resume to match the exact keywords, skills, and language in that job posting. The kind an ATS scans for before a human even sees it. Available on Basic and Pro.",
  },
  {
    q: "What are session recordings?",
    a: "After every interview session on Pro, you can go back and see a full log of every question that was asked and the answer CoopilotX suggested. This lets you review what happened, spot patterns, and improve for the next interview.",
  },
  {
    q: "Can I cancel or switch plans anytime?",
    a: "Yes. Cancel from your account settings with one click. You keep full access until the end of your billing period. Upgrades take effect immediately. Downgrades take effect at the next billing cycle.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Resume text is used only during your session and is never permanently stored. Interview audio is processed on your device. Raw audio is never sent to our servers. We never sell your data or use it to train AI models. Full details in our Privacy Policy.",
  },
  {
    q: "What if I want a refund?",
    a: "We offer a full refund within 7 days of your first paid subscription. No forms, no questions. Email support@coopilotxai.com and we will sort it out.",
  },
];

// ─── Cell ─────────────────────────────────────────────────────────────────────
function Cell({ val, accent }: { val: boolean | string; accent?: boolean }) {
  if (val === false) return <div className="flex justify-center"><DashIcon /></div>;
  if (val === true) return <div className="flex justify-center"><CheckIcon accent={accent} /></div>;
  return <p className={`text-center text-xs font-semibold ${accent ? "text-violet-700" : "text-gray-700"}`}>{val}</p>;
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

// ─── Main ─────────────────────────────────────────────────────────────────────
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
  const visibleRows = showAll ? ROWS : ROWS.slice(0, 10);

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {showAuth && <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />}
      <PageHeader />

      {/* ══ HERO ═══════════════════════════════════════════════════════════════ */}
      <section className="relative pt-20 pb-16 px-6 text-center overflow-hidden"
        style={{ background: "linear-gradient(150deg, #faf8ff 0%, #f4edff 40%, #fff4ec 75%, #fdf8ff 100%)" }}>
        <div className="absolute pointer-events-none top-0 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)", filter: "blur(80px)", transform: "translateX(-50%)" }} />
        <div className="absolute pointer-events-none top-0 right-0 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(234,88,12,0.10) 0%, transparent 65%)", filter: "blur(70px)" }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.05) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative max-w-3xl mx-auto z-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-violet-200/70 shadow-sm backdrop-blur-sm mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
            </span>
            <span className="text-[11px] font-semibold text-gray-600 tracking-wide">Simple pricing · No hidden fees · Cancel anytime</span>
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
            AI listens during your real interview and shows the perfect answer on your screen in 1.8 seconds. Completely invisible to the interviewer. Start free.
          </motion.p>

          {/* Trust bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400 mb-10">
            {["Secure checkout via Stripe", "Cancel anytime", "7-day money-back", "Audio never stored"].map((t, i) => (
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
            className="flex flex-col items-center gap-2.5">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Billing period</p>
            <div className="inline-flex items-center bg-white/80 backdrop-blur-sm border-2 border-violet-200/70 rounded-full p-1.5 shadow-md gap-1">
              <button onClick={() => setAnnual(false)}
                className={`px-6 py-2.5 rounded-full text-sm font-black transition-all ${!annual ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                Monthly
              </button>
              <button onClick={() => setAnnual(true)}
                className={`px-6 py-2.5 rounded-full text-sm font-black transition-all flex items-center gap-2 ${annual ? "text-white" : "text-violet-700 hover:text-violet-900"}`}
                style={annual ? { background: "linear-gradient(135deg, #6d28d9, #9333ea, #ea580c)", boxShadow: "0 2px 12px rgba(109,40,217,0.3)" } : {}}>
                Annual
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full text-white`}
                  style={{ background: annual ? "rgba(255,255,255,0.2)" : "linear-gradient(135deg, #6d28d9, #ea580c)" }}>
                  Save 33%
                </span>
              </button>
            </div>
            <AnimatePresence>
              {!annual && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs font-semibold text-violet-600 cursor-pointer hover:text-violet-800 transition-colors"
                  onClick={() => setAnnual(true)}>
                  Switch to annual: Basic $8/mo · Pro $19/mo
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ══ PLAN CARDS ══════════════════════════════════════════════════════════ */}
      <section className="relative px-6 pb-20"
        style={{ background: "linear-gradient(180deg, #fdf8ff 0%, #ffffff 35%)" }}>
        <div className="max-w-6xl mx-auto -mt-2">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan, i) => {
              const price    = annual ? plan.annualPrice : plan.monthlyPrice;
              const isCurrent = currentPlan === plan.id;
              const savings  = plan.monthlyPrice > 0 ? (plan.monthlyPrice - plan.annualPrice) * 12 : 0;
              return (
                <motion.div key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.09, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative rounded-2xl flex flex-col overflow-hidden ${plan.popular ? "shadow-2xl shadow-violet-200/50" : "shadow-sm"}`}
                  style={plan.popular
                    ? { background: "linear-gradient(160deg, #faf7ff 0%, #f3ecff 55%, #fff7f3 100%)", border: "1.5px solid rgba(124,58,237,0.22)" }
                    : { background: "#fff", border: "1px solid #e5e7eb" }}
                >
                  {/* Gradient top stripe */}
                  <div className="h-1 w-full"
                    style={{ background: plan.popular
                      ? "linear-gradient(90deg, #6d28d9, #9333ea, #ea580c)"
                      : plan.id === "pro"
                      ? "linear-gradient(90deg, #9333ea, #ea580c)"
                      : "#e5e7eb" }} />

                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute top-3 right-4 text-[10px] font-black px-3 py-1 rounded-full text-white"
                      style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)" }}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="p-6 pb-4">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{plan.emoji}</span>
                      <h2 className="text-xl font-black text-gray-900">{plan.name}</h2>
                    </div>
                    <p className="text-xs font-semibold mb-4"
                      style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                      {plan.tagline}
                    </p>

                    {/* Price */}
                    <div className="mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-gray-900 tracking-tight">
                          {price === 0 ? "Free" : `$${price}`}
                        </span>
                        {price > 0 && <span className="text-sm text-gray-400">/ mo</span>}
                      </div>
                      {annual && savings > 0 && (
                        <p className="text-xs mt-0.5 font-semibold text-emerald-600">
                          ${plan.annualPrice * 12}/yr billed, save ${savings}
                        </p>
                      )}
                      {price === 0 && <p className="text-xs text-gray-400 mt-0.5">No credit card</p>}
                    </div>

                    {/* Usage pool */}
                    <div className="rounded-xl px-3 py-2.5 mb-3"
                      style={{ background: "rgba(109,40,217,0.06)", border: "1px solid rgba(109,40,217,0.12)" }}>
                      <p className="text-xs font-black text-violet-700">{plan.usagePool}</p>
                      <p className="text-[10px] text-violet-500 mt-0.5">{plan.usageBreakdown}</p>
                    </div>

                    {/* Ideal for */}
                    <p className="text-xs text-gray-500 leading-relaxed mb-1">
                      <span className="font-semibold text-gray-700">Best for: </span>{plan.idealFor}
                    </p>

                    {/* Unlock line */}
                    <div className="rounded-xl px-3 py-2 mb-4 mt-2"
                      style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                      <p className="text-[11px] font-semibold text-emerald-700">✦ {plan.unlock}</p>
                    </div>

                    {/* CTA */}
                    {plan.id === "free" ? (
                      <button onClick={() => !user && setShowAuth(true)}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                          isCurrent || user ? "bg-gray-100 text-gray-400 cursor-default" : "bg-gray-900 hover:bg-gray-700 text-white"
                        }`}>
                        {isCurrent ? "Current plan" : user ? "You're on Starter" : plan.cta}
                      </button>
                    ) : (
                      <button onClick={() => handleCheckout(plan.id as "basic" | "pro")}
                        disabled={!!loading || isCurrent}
                        className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: isCurrent ? "#d1d5db" : "linear-gradient(135deg, #6d28d9, #9333ea, #ea580c)", boxShadow: isCurrent ? "none" : "0 4px 18px rgba(109,40,217,0.28)" }}>
                        {isCurrent ? "Current plan" : loading === plan.id ? "Redirecting..." : plan.cta}
                      </button>
                    )}
                    <p className="text-center text-[10px] text-gray-400 mt-1.5">{plan.ctaNote}</p>
                  </div>

                  {/* Features */}
                  <div className="px-6 py-4 flex-1 border-t border-gray-100/80">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">What you get</p>
                    <ul className="space-y-4">
                      {plan.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2.5">
                          <span className="text-base flex-shrink-0 mt-0.5">{f.icon}</span>
                          <span className="flex flex-col gap-0.5">
                            <span className={`text-xs font-semibold leading-snug ${f.key ? "text-gray-900" : "text-gray-800"}`}>
                              {f.title}
                              {f.key && (
                                <span className="ml-1.5 inline-flex items-center text-[9px] font-black text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">KEY</span>
                              )}
                            </span>
                            <span className="text-[11px] text-gray-500 leading-relaxed">{f.desc}</span>
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Not included */}
                    {plan.notIncluded.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Not included</p>
                        <ul className="space-y-1.5">
                          {plan.notIncluded.map((t, ti) => (
                            <li key={ti} className="flex items-start gap-2 opacity-50">
                              <DashIcon />
                              <span className="text-xs text-gray-400">{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="h-5" />
                </motion.div>
              );
            })}
          </div>

          {!annual && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              className="text-center text-sm mt-5">
              <button onClick={() => setAnnual(true)}
                className="text-violet-600 font-bold hover:text-violet-800 underline underline-offset-2 transition-colors">
                Pay annually and save 33%. Basic drops to $8/mo, Pro drops to $19/mo.
              </button>
            </motion.p>
          )}
        </div>
      </section>

      {/* ══ WHAT CHANGES AT EACH LEVEL ═════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">What you unlock at each level</h2>
            <p className="text-gray-500 text-sm">Every upgrade adds one thing that genuinely changes how your interviews go.</p>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                plan: "Starter, try it free",
                color: "rgba(99,102,241,0.07)",
                border: "rgba(99,102,241,0.18)",
                tc: "#4f46e5",
                emoji: "🚀",
                items: [
                  { e: "🎤", b: "Hear the interviewer, see the full answer in 1.8 seconds during a real interview today" },
                  { e: "🧠", b: "AI reads your resume so answers use your actual experience, not a generic template" },
                  { e: "💬", b: "Practice realistic questions for your exact role before the real thing" },
                  { e: "📄", b: "Walk in with a professional resume you built yourself" },
                ],
              },
              {
                plan: "Basic, serious edge",
                color: "rgba(109,40,217,0.07)",
                border: "rgba(109,40,217,0.20)",
                tc: "#6d28d9",
                emoji: "⚡",
                items: [
                  { e: "🖥️", b: "Desktop app makes the overlay completely invisible in screen recordings. Zoom cannot capture it." },
                  { e: "📋", b: "Paste any job description and the AI rewrites your resume to match that exact role in 30 seconds" },
                  { e: "🎯", b: "Stronger AI model handles behavioral questions and complex multi-part answers naturally" },
                  { e: "🔁", b: "1,000 fresh credits every month. Enough to prep daily and still have plenty left for real interviews." },
                ],
              },
              {
                plan: "Pro, no limits",
                color: "rgba(234,88,12,0.07)",
                border: "rgba(234,88,12,0.18)",
                tc: "#ea580c",
                emoji: "👑",
                items: [
                  { e: "♾️", b: "No credits at all. Run the copilot in every interview, every day, with nothing counting in the background." },
                  { e: "👁️", b: "Camera stealth hides the overlay even if someone physically looks at your laptop screen" },
                  { e: "📼", b: "After each interview, every question asked and every answer the AI gave is saved for you to review" },
                  { e: "🧠", b: "Best AI model that handles FAANG system design, case interviews and senior level behavioral questions" },
                ],
              },
            ].map((col, ci) => (
              <FadeUp key={ci} delay={ci * 0.1}>
                <div className="rounded-2xl p-6 h-full"
                  style={{ background: col.color, border: `1px solid ${col.border}` }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">{col.emoji}</span>
                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: col.tc }}>{col.plan}</p>
                  </div>
                  <ul className="space-y-3">
                    {col.items.map((item, ii) => (
                      <li key={ii} className="flex items-start gap-2.5">
                        <span className="text-sm flex-shrink-0">{item.e}</span>
                        <span className="text-xs text-gray-700 leading-snug">{item.b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CREDIT COSTS ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Exactly what each thing costs</h2>
            <p className="text-gray-500 text-sm">No surprises. Here is the full cost breakdown for Starter and Basic users.</p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {[
                { e: "🎤", action: "Live copilot", cost: "2 credits / min", note: "AI listens live and answers in real-time during your interview", tc: "#6d28d9", bg: "rgba(109,40,217,0.06)", bd: "rgba(109,40,217,0.14)" },
                { e: "💬", action: "Mock interview session", cost: "15 credits", note: "Full AI-powered practice with questions tailored to your role", tc: "#ea580c", bg: "rgba(234,88,12,0.06)", bd: "rgba(234,88,12,0.14)" },
                { e: "📋", action: "AI resume tailoring", cost: "20 credits", note: "Rewrite your resume to match any specific job description", tc: "#059669", bg: "rgba(16,185,129,0.06)", bd: "rgba(16,185,129,0.14)" },
                { e: "✅", action: "Resume verification", cost: "Free always", note: "Check the AI reads your resume correctly before you start", tc: "#4f46e5", bg: "rgba(99,102,241,0.06)", bd: "rgba(99,102,241,0.14)" },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl p-5" style={{ background: item.bg, border: `1px solid ${item.bd}` }}>
                  <div className="text-2xl mb-2">{item.e}</div>
                  <p className="text-sm font-bold text-gray-800 mb-1">{item.action}</p>
                  <p className="text-base font-black mb-2" style={{ color: item.tc }}>{item.cost}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.note}</p>
                </div>
              ))}
            </div>
          </FadeUp>

          <FadeUp delay={0.15}>
            <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 shadow-sm border border-gray-200 bg-white">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.1), rgba(234,88,12,0.08))" }}>⚡</div>
              <div className="flex-1 text-center sm:text-left">
                <p className="font-bold text-gray-900 text-sm">Pro skips the credit system entirely</p>
                <p className="text-xs text-gray-500 mt-0.5">No credits, no tracking, no caps. Use the live copilot, mock interviews and resume tools as much as you want. Unlimited.</p>
              </div>
              <button onClick={() => handleCheckout("pro")}
                className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)", boxShadow: "0 4px 16px rgba(109,40,217,0.25)" }}>
                Get Pro
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══ COMPARISON TABLE ════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Full plan comparison</h2>
            <p className="text-gray-500 text-sm">Every feature side by side. No surprises, no small print.</p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
              <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200">
                <div className="px-6 py-4" />
                {[
                  { name: "Starter", price: "Free",                             accent: false },
                  { name: "Basic",   price: annual ? "$8/mo" : "$12/mo",        accent: true  },
                  { name: "Pro",     price: annual ? "$19/mo" : "$29/mo",       accent: false },
                ].map(({ name, price, accent }, i) => (
                  <div key={i} className={`px-4 py-4 text-center border-l border-gray-200 ${accent ? "bg-violet-50/60" : ""}`}>
                    <p className={`text-sm font-black ${accent ? "text-violet-700" : "text-gray-900"}`}>{name}</p>
                    <p className={`text-xs mt-0.5 font-semibold ${accent ? "text-violet-400" : "text-gray-400"}`}>{price}</p>
                  </div>
                ))}
              </div>

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
                      <div className={`grid grid-cols-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors`}>
                        <div className="px-6 py-3.5"><span className="text-sm text-gray-600">{row.label}</span></div>
                        <div className="px-4 py-3.5 border-l border-gray-100 flex items-center justify-center"><Cell val={row.free} /></div>
                        <div className="px-4 py-3.5 border-l border-gray-100 bg-violet-50/20 flex items-center justify-center"><Cell val={row.basic} accent /></div>
                        <div className="px-4 py-3.5 border-l border-gray-100 flex items-center justify-center"><Cell val={row.pro} /></div>
                      </div>
                    </div>
                  );
                });
              })()}

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

      {/* ══ GUARANTEE ══════════════════════════════════════════════════════════ */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <FadeUp>
            <div className="rounded-2xl px-8 py-7 flex flex-col sm:flex-row items-center gap-6 shadow-sm"
              style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.05), rgba(234,88,12,0.04))", border: "1px solid rgba(109,40,217,0.12)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)" }}>
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 mb-1">7-day money-back guarantee</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Not satisfied within 7 days of your first paid subscription? Email{" "}
                  <a href="mailto:support@coopilotxai.com" className="font-semibold hover:underline" style={{ color: "#6d28d9" }}>
                    support@coopilotxai.com
                  </a>{" "}
                  and we will refund you in full. No questions, no forms, no waiting.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-2xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Common questions</h2>
            <p className="text-gray-500 text-sm">Everything you need to know before you sign up.</p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="bg-white rounded-2xl border border-gray-200 px-8 shadow-sm">
              {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
            </div>
            <p className="text-center text-sm text-gray-400 mt-6">
              Something else?{" "}
              <a href="mailto:support@coopilotxai.com" className="text-violet-600 font-semibold hover:underline">Email us</a>
              {" "}and we reply same day.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ══ BOTTOM CTA ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #faf8ff 0%, #f4edff 40%, #fff4ec 75%, #fdf8ff 100%)" }}>
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[300px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(109,40,217,0.10) 0%, transparent 70%)", filter: "blur(60px)" }} />
        </div>
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
              Start free. No card, no commitment. See it work in your next interview, then decide.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => !user && setShowAuth(true)}
                className="px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-lg"
                style={{ background: "linear-gradient(135deg, #6d28d9, #9333ea, #ea580c)", boxShadow: "0 6px 24px rgba(109,40,217,0.3)" }}>
                Start for free
              </button>
              <Link href="/real-interview"
                className="px-8 py-3.5 rounded-xl border border-gray-200 bg-white hover:border-violet-300 text-gray-700 hover:text-violet-700 font-semibold text-sm transition-all">
                Try live copilot now
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 mt-8 text-[11px] text-gray-400">
              {["50,000+ interviews assisted", "87% offer rate", "1.8s answer speed", "100% private"].map((s, i) => (
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
