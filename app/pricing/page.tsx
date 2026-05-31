"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { getUserProfile, type PlanId } from "../lib/credits";
import AuthModal from "../../components/AuthModal";
import Link from "next/link";
import { PageHeader, PageFooter } from "../../components/PageShell";

// ─── Icons ────────────────────────────────────────────────────────────────────
function Check() {
  return (
    <svg className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}
function Dash() {
  return <span className="w-4 h-4 flex-shrink-0 mt-0.5 flex items-center justify-center text-gray-300 text-lg leading-none">–</span>;
}

// ─── Plan data ────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "free" as PlanId,
    name: "Starter",
    tagline: "Try it out — no card needed",
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Get started free",
    highlight: false,
    badge: null,
    forWho: "Perfect if you have 1–2 upcoming interviews and want to see how it works.",
    topFeatures: [
      "Build & download your resume",
      "Practice with 3 mock interview sessions",
      "5 minutes of live copilot per session",
      "Basic AI suggestions (fast & lightweight)",
      "Works in your browser — nothing to install",
    ],
  },
  {
    id: "basic" as PlanId,
    name: "Basic",
    tagline: "For active job hunters",
    monthlyPrice: 12,
    annualPrice: 8,
    cta: "Start Basic",
    highlight: true,
    badge: "Most popular",
    forWho: "You're actively applying and need a reliable edge every interview.",
    topFeatures: [
      "Everything in Starter",
      "Unlimited resumes — tailor for every job",
      "AI rewrites your resume to match the job description",
      "10 full mock interview sessions per month",
      "60 minutes of live copilot time per month",
      "Smarter AI model (sharper, more detailed answers)",
      "Desktop app for Windows — works off-screen",
    ],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    tagline: "For high-stakes interviews",
    monthlyPrice: 29,
    annualPrice: 19,
    cta: "Start Pro",
    highlight: false,
    badge: "Best value",
    forWho: "You're targeting top companies and need every advantage — no limits.",
    topFeatures: [
      "Everything in Basic",
      "Unlimited mock interviews — practice every day",
      "Unlimited live copilot time — no per-minute cap",
      "Our best AI model (GPT-4 level — most human-sounding answers)",
      "Works on Windows & Mac desktop apps",
      "Camera-safe stealth mode — completely invisible on video calls",
      "Review past sessions to track your progress",
      "Priority response speed — answer in under 2 seconds",
      "Every new feature added — automatically included",
    ],
  },
];

// Full comparison table rows
const COMPARE_ROWS = [
  { category: "Resume", label: "Resume builder",                  free: true,  basic: true,  pro: true  },
  { category: "Resume", label: "Unlimited resumes",               free: false, basic: true,  pro: true  },
  { category: "Resume", label: "AI tailoring to job description", free: false, basic: true,  pro: true  },

  { category: "Mock Interview", label: "Mock interview sessions",         free: "3 total",       basic: "10/month",   pro: "Unlimited"   },
  { category: "Mock Interview", label: "AI-generated questions",          free: true,            basic: true,         pro: true          },
  { category: "Mock Interview", label: "Answer feedback & scoring",       free: true,            basic: true,         pro: true          },

  { category: "Live Copilot",   label: "Real-time live interview help",   free: "5 min/session", basic: "60 min/mo",  pro: "Unlimited"   },
  { category: "Live Copilot",   label: "Answer generated in",             free: "< 3 sec",       basic: "< 2 sec",    pro: "< 2 sec"     },
  { category: "Live Copilot",   label: "AI quality",                      free: "Standard",      basic: "Enhanced",   pro: "Best (GPT-4)"},
  { category: "Live Copilot",   label: "Camera stealth mode",             free: false,           basic: false,        pro: true          },
  { category: "Live Copilot",   label: "Session history",                 free: false,           basic: false,        pro: true          },

  { category: "Apps",           label: "Browser (web app)",               free: true,            basic: true,         pro: true          },
  { category: "Apps",           label: "Windows desktop app",             free: false,           basic: true,         pro: true          },
  { category: "Apps",           label: "macOS desktop app",               free: false,           basic: false,        pro: true          },

  { category: "Support",        label: "Email support",                   free: true,            basic: true,         pro: true          },
  { category: "Support",        label: "Priority support",                free: false,           basic: false,        pro: true          },
  { category: "Support",        label: "Future features included",        free: false,           basic: false,        pro: true          },
];

const FAQS = [
  {
    q: "What exactly is the live copilot?",
    a: "During your real interview, CoopilotX listens to what the interviewer says and instantly shows you a suggested answer on your screen — completely invisible to them. You hear the question, glance at the answer, and respond naturally. It works on video calls, phone calls, and in-person interviews.",
  },
  {
    q: "Is it really undetectable?",
    a: "Yes. The app runs as a separate window that doesn't show up in screen shares. Camera stealth mode (Pro) goes further — the overlay is invisible even if someone is looking at your screen. There's nothing to install on the interviewer's end.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Cancel from your account settings with one click. You keep access until the end of your billing period — we don't cut you off immediately.",
  },
  {
    q: "What if I'm not satisfied?",
    a: "We offer a full refund within 7 days of your first paid subscription. Just email support@coopilotxai.com and we'll sort it out — no questions asked.",
  },
  {
    q: "What's the difference between Basic and Pro AI?",
    a: "Basic uses a fast, smart AI model that handles most interview questions well. Pro uses our highest-quality model (GPT-4 level) which gives more nuanced, senior-sounding answers — particularly better for complex behavioural and technical questions at top companies.",
  },
  {
    q: "Do unused credits or minutes roll over?",
    a: "Monthly usage resets each billing cycle. We recommend using the plan that matches your actual interview frequency — if you're in heavy job-hunt mode, Pro gives you unlimited usage without any tracking.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes — upgrade or downgrade anytime. Upgrades take effect immediately. Downgrades take effect at the next billing cycle.",
  },
  {
    q: "Is my resume and interview data private?",
    a: "Yes. Your resume is only used during your session — we never store it permanently. Interview audio is processed on your device and never sent to our servers. We don't sell your data or use it to train AI models. Full details in our Privacy Policy.",
  },
];

// ─── Cell renderer ────────────────────────────────────────────────────────────
function Cell({ val, highlight }: { val: boolean | string; highlight?: boolean }) {
  if (val === false) return <div className="flex justify-center"><Dash /></div>;
  if (val === true)  return <div className={`flex justify-center`}><Check /></div>;
  return (
    <div className={`text-center text-xs font-semibold ${highlight ? "text-indigo-700" : "text-gray-600"}`}>
      {val}
    </div>
  );
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
      >
        <span className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{q}</span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
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

  const handleCheckout = async (plan: "basic" | "pro") => {
    if (!user) { setShowAuth(true); return; }
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, annual, uid: user.uid, email: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* handled below */ }
    setLoading(null);
  };

  const currentPlan = profile?.plan as PlanId | undefined;

  // Group compare rows by category
  const categories = Array.from(new Set(COMPARE_ROWS.map(r => r.category)));
  const visibleRows = showAll ? COMPARE_ROWS : COMPARE_ROWS.slice(0, 8);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      {showAuth && <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />}
      <PageHeader />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="pt-20 pb-14 px-6 text-center"
        style={{ background: "linear-gradient(150deg, #faf8ff 0%, #f4edff 50%, #fdf8ff 100%)" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
            One offer pays for<br />
            <span className="text-indigo-600">years of subscriptions.</span>
          </h1>
          <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            CoopilotX gives you real answers in real interviews. Start free, upgrade when you need more.
          </p>

          {/* Trust bar */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400 mb-10">
            {["Secure checkout via Stripe", "Cancel anytime", "7-day money-back guarantee", "No hidden fees"].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t}
              </span>
            ))}
          </div>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1 gap-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              Annual
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                Save 33%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Plan Cards ────────────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto -mt-6">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan, i) => {
              const price = annual ? plan.annualPrice : plan.monthlyPrice;
              const isCurrent = currentPlan === plan.id;
              const savings = plan.monthlyPrice > 0
                ? (plan.monthlyPrice - plan.annualPrice) * 12
                : 0;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`relative rounded-2xl flex flex-col ${
                    plan.highlight
                      ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-200 ring-1 ring-indigo-500"
                      : "bg-white border border-gray-200 shadow-sm"
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-4 py-1 rounded-full ${
                      plan.highlight
                        ? "bg-white text-indigo-600"
                        : "bg-indigo-600 text-white"
                    }`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="p-7 pb-5">
                    {/* Plan name + tagline */}
                    <div className="mb-5">
                      <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${plan.highlight ? "text-indigo-200" : "text-indigo-600"}`}>
                        {plan.tagline}
                      </p>
                      <h2 className={`text-2xl font-black ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                        {plan.name}
                      </h2>
                    </div>

                    {/* Price */}
                    <div className="mb-2">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-5xl font-black tracking-tight ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                          {price === 0 ? "Free" : `$${price}`}
                        </span>
                        {price > 0 && (
                          <span className={`text-sm ${plan.highlight ? "text-indigo-200" : "text-gray-400"}`}>
                            / month
                          </span>
                        )}
                      </div>
                      {annual && savings > 0 && (
                        <p className={`text-xs mt-1 font-medium ${plan.highlight ? "text-indigo-200" : "text-emerald-600"}`}>
                          ${plan.annualPrice * 12}/year — you save ${savings}
                        </p>
                      )}
                      {!annual && price === 0 && (
                        <p className={`text-xs mt-1 ${plan.highlight ? "text-indigo-200" : "text-gray-400"}`}>
                          No credit card required
                        </p>
                      )}
                    </div>

                    {/* Who it's for */}
                    <p className={`text-sm leading-relaxed mb-6 pt-3 border-t ${
                      plan.highlight ? "text-indigo-100 border-indigo-500" : "text-gray-500 border-gray-100"
                    }`}>
                      {plan.forWho}
                    </p>

                    {/* CTA */}
                    {plan.id === "free" ? (
                      <button
                        onClick={() => !user && setShowAuth(true)}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                          isCurrent || user
                            ? "bg-gray-100 text-gray-500 cursor-default"
                            : "bg-gray-900 hover:bg-gray-700 text-white"
                        }`}
                      >
                        {isCurrent || user ? "Current plan" : plan.cta}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCheckout(plan.id as "basic" | "pro")}
                        disabled={!!loading || isCurrent}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                          isCurrent
                            ? "bg-indigo-100 text-indigo-500 cursor-default"
                            : plan.highlight
                            ? "bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                      >
                        {isCurrent ? "Current plan" : loading === plan.id ? "Redirecting…" : plan.cta}
                      </button>
                    )}
                  </div>

                  {/* Feature list */}
                  <div className={`px-7 py-5 flex-1 border-t ${plan.highlight ? "border-indigo-500" : "border-gray-100"}`}>
                    <p className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${plan.highlight ? "text-indigo-200" : "text-gray-400"}`}>
                      What's included
                    </p>
                    <ul className="space-y-3">
                      {plan.topFeatures.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2.5">
                          <svg
                            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-indigo-200" : "text-indigo-500"}`}
                            viewBox="0 0 20 20" fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className={`text-sm leading-snug ${plan.highlight ? "text-indigo-50" : "text-gray-600"}`}>
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bottom padding */}
                  <div className="h-7" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Full Comparison Table ─────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">Full plan comparison</h2>
            <p className="text-gray-500 text-sm">Everything side by side — so you know exactly what you're getting.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-4 border-b border-gray-100">
              <div className="px-6 py-4" />
              {["Starter", "Basic", "Pro"].map((name, i) => (
                <div key={name} className={`px-4 py-4 text-center border-l border-gray-100 ${i === 1 ? "bg-indigo-50" : ""}`}>
                  <p className={`text-sm font-black ${i === 1 ? "text-indigo-700" : "text-gray-900"}`}>{name}</p>
                  <p className={`text-xs mt-0.5 font-medium ${i === 1 ? "text-indigo-500" : "text-gray-400"}`}>
                    {i === 0 ? "Free" : i === 1 ? (annual ? "$8/mo" : "$12/mo") : (annual ? "$19/mo" : "$29/mo")}
                  </p>
                </div>
              ))}
            </div>

            {/* Rows */}
            {(() => {
              const rows = showAll ? COMPARE_ROWS : COMPARE_ROWS.slice(0, 9);
              let lastCat = "";
              return rows.map((row, i) => {
                const showCat = row.category !== lastCat;
                lastCat = row.category;
                return (
                  <div key={i}>
                    {showCat && (
                      <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-100">
                        <div className="px-6 py-2 col-span-4">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {row.category}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className={`grid grid-cols-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i === rows.length - 1 ? "border-0" : ""}`}>
                      <div className="px-6 py-3.5">
                        <span className="text-sm text-gray-600">{row.label}</span>
                      </div>
                      <div className="px-4 py-3.5 border-l border-gray-100">
                        <Cell val={row.free} />
                      </div>
                      <div className="px-4 py-3.5 border-l border-gray-100 bg-indigo-50/30">
                        <Cell val={row.basic} highlight />
                      </div>
                      <div className="px-4 py-3.5 border-l border-gray-100">
                        <Cell val={row.pro} />
                      </div>
                    </div>
                  </div>
                );
              });
            })()}

            {/* Show more / less */}
            <div className="border-t border-gray-100">
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 transition-colors flex items-center justify-center gap-2"
              >
                {showAll ? "Show less" : `Show all ${COMPARE_ROWS.length} features`}
                <svg className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Guarantee ─────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-8 py-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-1">7-day money-back guarantee</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                If you're not completely satisfied within 7 days of your first paid subscription, email us at{" "}
                <a href="mailto:support@coopilotxai.com" className="text-indigo-600 font-semibold hover:underline">
                  support@coopilotxai.com
                </a>{" "}
                and we'll refund you in full — no questions, no forms, no hassle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">Common questions</h2>
            <p className="text-gray-500 text-sm">Still unsure? These cover what most people ask before signing up.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 px-8 shadow-sm">
            {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
          </div>
          <p className="text-center text-sm text-gray-400 mt-8">
            Something else?{" "}
            <a href="mailto:support@coopilotxai.com" className="text-indigo-600 font-semibold hover:underline">
              Email us
            </a>{" "}
            — we reply within 24 hours.
          </p>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white border-t border-gray-100 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 mb-3">Start for free today</h2>
          <p className="text-gray-500 text-sm mb-8">
            No credit card. No commitment. See exactly how it works in your next interview — then decide.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => !user && setShowAuth(true)}
              className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-sm"
            >
              Get started free
            </button>
            <Link
              href="/real-interview"
              className="px-8 py-3.5 rounded-xl border border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-700 font-semibold text-sm transition-all"
            >
              Try live copilot now →
            </Link>
          </div>
        </div>
      </section>

      <PageFooter />
    </div>
  );
}
