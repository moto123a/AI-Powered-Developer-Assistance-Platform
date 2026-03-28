// frontend/app/pricing/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { getUserProfile, PLAN_CONFIG, CREDIT_COSTS, type PlanId } from "../lib/credits";
import AuthModal from "../../components/AuthModal";
import { Check, X, Zap, Crown, Sparkles, CreditCard } from "lucide-react";

export default function PricingPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
      }
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
        body: JSON.stringify({
          plan,
          annual,
          uid: user.uid,
          email: user.email,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Checkout failed. Try again.");
    } catch {
      alert("Error creating checkout session.");
    }
    setLoading(null);
  };

  const tiers = [
    {
      id: "free" as PlanId,
      name: "Free",
      price: 0,
      annualPrice: 0,
      credits: "100 credits",
      icon: Zap,
      color: "slate",
      features: [
        { text: "Resume builder (2 resumes)", included: true },
        { text: "3 mock interview sessions", included: true },
        { text: "5 min real-time copilot", included: true },
        { text: "Groq Llama AI", included: true },
        { text: "Web app only", included: true },
        { text: "AI resume tailoring", included: false },
        { text: "GPT-4.1 / GPT-4o", included: false },
        { text: "Desktop app", included: false },
        { text: "Camera stealth mode", included: false },
        { text: "Session recordings", included: false },
      ],
    },
    {
      id: "basic" as PlanId,
      name: "Basic",
      price: 12,
      annualPrice: 8,
      credits: "1,000 credits/mo",
      icon: Sparkles,
      color: "blue",
      popular: true,
      features: [
        { text: "Unlimited resumes", included: true },
        { text: "10 mock interviews/month", included: true },
        { text: "60 min real-time/month", included: true },
        { text: "GPT-4o-mini + Groq", included: true },
        { text: "AI resume tailoring", included: true },
        { text: "Web + 1 desktop app", included: true },
        { text: "GPT-4.1 (best AI)", included: false },
        { text: "Camera stealth mode", included: false },
        { text: "Session recordings", included: false },
        { text: "Priority AI speed", included: false },
      ],
    },
    {
      id: "pro" as PlanId,
      name: "Pro",
      price: 29,
      annualPrice: 19,
      credits: "Unlimited",
      icon: Crown,
      color: "purple",
      features: [
        { text: "Everything in Basic", included: true },
        { text: "Unlimited mock interviews", included: true },
        { text: "Unlimited real-time copilot", included: true },
        { text: "GPT-4.1 (best AI)", included: true },
        { text: "All AI models", included: true },
        { text: "Windows + Mac apps", included: true },
        { text: "Camera stealth mode", included: true },
        { text: "Session recordings", included: true },
        { text: "Priority AI speed", included: true },
        { text: "All future features", included: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#030305] text-white">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <CreditCard size={14} className="text-blue-400" />
            <span className="text-sm text-blue-400 font-medium">Simple, transparent pricing</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight">
            Pick your <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">plan</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Start free with 100 credits. Upgrade when you need more power.
          </p>

          {/* Annual toggle */}
          <div className="inline-flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-full p-1">
            <button onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? "bg-blue-600 text-white" : "text-slate-400"}`}>
              Monthly
            </button>
            <button onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${annual ? "bg-blue-600 text-white" : "text-slate-400"}`}>
              Annual <span className="text-green-400 text-xs ml-1">save 33%</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => {
            const isCurrentPlan = profile?.plan === tier.id;
            const price = annual ? tier.annualPrice : tier.price;

            return (
              <motion.div key={tier.id}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  tier.popular
                    ? "border-blue-500/50 bg-gradient-to-b from-blue-950/30 to-slate-950/80"
                    : "border-slate-800 bg-slate-950/80"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    Most popular
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      tier.color === "blue" ? "bg-blue-500/20 text-blue-400" :
                      tier.color === "purple" ? "bg-purple-500/20 text-purple-400" :
                      "bg-slate-800 text-slate-400"
                    }`}>
                      <tier.icon size={20} />
                    </div>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">${price}</span>
                    {price > 0 && <span className="text-slate-500 text-sm">/month</span>}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">{tier.credits}</div>
                  {annual && price > 0 && (
                    <div className="text-xs text-green-400 mt-1">
                      ${price * 12}/year (save ${(tier.price - tier.annualPrice) * 12}/yr)
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3 mb-8">
                  {tier.features.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-3 text-sm">
                      {f.included ? (
                        <Check size={16} className="text-green-400 mt-0.5 shrink-0" />
                      ) : (
                        <X size={16} className="text-slate-700 mt-0.5 shrink-0" />
                      )}
                      <span className={f.included ? "text-slate-300" : "text-slate-600"}>{f.text}</span>
                    </div>
                  ))}
                </div>

                {tier.id === "free" ? (
                  <button
                    onClick={() => !user && setShowAuth(true)}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                      isCurrentPlan
                        ? "bg-slate-800 text-slate-500 cursor-default"
                        : "bg-slate-800 hover:bg-slate-700 text-white"
                    }`}
                  >
                    {isCurrentPlan ? "Current Plan" : user ? "Current Plan" : "Get Started Free"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(tier.id as "basic" | "pro")}
                    disabled={loading === tier.id || isCurrentPlan}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                      isCurrentPlan
                        ? "bg-slate-800 text-slate-500 cursor-default"
                        : tier.popular
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                        : "bg-purple-600 hover:bg-purple-500 text-white"
                    }`}
                  >
                    {isCurrentPlan ? "Current Plan" : loading === tier.id ? "Redirecting..." : `Upgrade to ${tier.name}`}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Credit Costs Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-16 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Credit costs per action</h3>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            {[
              { label: "Resume analysis", cost: CREDIT_COSTS.resume_analysis },
              { label: "AI resume tailor", cost: CREDIT_COSTS.resume_tailor },
              { label: "Mock interview session", cost: CREDIT_COSTS.mock_interview_session },
              { label: "Mock feedback", cost: CREDIT_COSTS.mock_feedback },
              { label: "Real-time copilot (per minute)", cost: CREDIT_COSTS.realtime_per_minute },
              { label: "Question generation", cost: CREDIT_COSTS.question_generation },
              { label: "Resume verification", cost: CREDIT_COSTS.verify_resume, free: true },
            ].map((item, i) => (
              <div key={i} className={`flex justify-between items-center px-6 py-4 ${i < 6 ? "border-b border-slate-800/50" : ""}`}>
                <span className="text-slate-300 text-sm">{item.label}</span>
                <span className={`text-sm font-bold ${item.free ? "text-green-400" : "text-white"}`}>
                  {item.free ? "Free" : `${item.cost} credits`}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto text-center">
          <p className="text-slate-500 text-sm">
            Questions? Email <a href="mailto:support@coopilotxai.com" className="text-blue-400 hover:underline">support@coopilotxai.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}