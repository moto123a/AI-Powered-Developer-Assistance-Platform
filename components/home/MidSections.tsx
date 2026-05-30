"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FadeUp, FadeIn, Counter, COMPANIES_ROW1, COMPANIES_ROW2 } from "./shared";

/* ── TRUSTED BY ─────────────────────────────────────────────── */
export function TrustedBySection() {
  const row1 = [...COMPANIES_ROW1, ...COMPANIES_ROW1, ...COMPANIES_ROW1];
  const row2 = [...COMPANIES_ROW2, ...COMPANIES_ROW2, ...COMPANIES_ROW2];
  return (
    <section className="py-14 bg-white border-y border-gray-100 overflow-hidden">
      <style>{`
        @keyframes tickerLeft {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes tickerRight {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .ticker-left  { animation: tickerLeft  28s linear infinite; }
        .ticker-right { animation: tickerRight 36s linear infinite; }
        .ticker-left:hover,
        .ticker-right:hover { animation-play-state: paused; }
      `}</style>

      <div className="max-w-6xl mx-auto px-6 mb-9">
        <FadeIn>
          <p className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-[0.3em]">
            Users have landed offers at
          </p>
        </FadeIn>
      </div>

      <div className="relative space-y-3">
        {/* Row 1 — left (global tech) */}
        <div className="flex ticker-left gap-3 w-max">
          {row1.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-500 whitespace-nowrap flex-shrink-0 hover:border-violet-200 hover:text-violet-700 hover:shadow-sm transition-all cursor-default select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              {c}
            </span>
          ))}
        </div>

        {/* Row 2 — right (startups & Indian tech) */}
        <div className="flex ticker-right gap-3 w-max">
          {row2.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-500 whitespace-nowrap flex-shrink-0 hover:border-indigo-200 hover:text-indigo-700 hover:shadow-sm transition-all cursor-default select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
              {c}
            </span>
          ))}
        </div>

        {/* Edge fades */}
        <div className="absolute inset-y-0 left-0 w-28 pointer-events-none" style={{ background: "linear-gradient(to right, #ffffff, transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-28 pointer-events-none" style={{ background: "linear-gradient(to left, #ffffff, transparent)" }} />
      </div>
    </section>
  );
}

/* ── STATS ──────────────────────────────────────────────────── */
export function StatsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const stats = [
    { to: 50000, suf: "+", pre: "", label: "Interviews Assisted", sub: "and growing daily",       accent: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-500/5" },
    { to: 87,    suf: "%", pre: "", label: "Offer Rate",          sub: "for 5+ session users",    accent: "text-indigo-400", border: "border-indigo-500/20", bg: "bg-indigo-500/5" },
    { to: 2,     suf: "s", pre: "<",label: "Answer Speed",        sub: "streamed to your screen", accent: "text-cyan-400",   border: "border-cyan-500/20",   bg: "bg-cyan-500/5" },
    { to: 98,    suf: "%", pre: "", label: "Accuracy",            sub: "resume-grounded answers", accent: "text-emerald-400",border: "border-emerald-500/20",bg: "bg-emerald-500/5" },
  ];
  return (
    <section className="py-24 px-6 overflow-hidden bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <FadeUp className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">The numbers speak.</h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">Built on actual outcomes from 50,000+ interview sessions.</p>
        </FadeUp>
        <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-2xl border ${s.border} ${s.bg} p-7 text-center`}>
              <div className={`text-4xl font-black ${s.accent} mb-1`}>
                <Counter to={s.to} suffix={s.suf} prefix={s.pre} />
              </div>
              <div className="text-sm font-bold text-gray-700 mb-1">{s.label}</div>
              <div className="text-[11px] text-gray-600">{s.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── HOW IT WORKS ───────────────────────────────────────────── */
export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const steps = [
    { n: "1", icon: "📄", title: "Upload Your Resume",  desc: "Paste your resume once. The system reads every project, skill, and achievement so every answer comes from your real background.", color: "bg-violet-600", border: "border-violet-500/20 bg-violet-500/5" },
    { n: "2", icon: "🎤", title: "Start Your Interview", desc: "Open CoopilotX on desktop or web. It silently listens via mic, transcribes speech in real-time, and works invisibly on any platform.", color: "bg-indigo-600", border: "border-indigo-500/20 bg-indigo-500/5" },
    { n: "3", icon: "⚡", title: "Get Perfect Answers",  desc: "Tailored answers stream to your stealth overlay in under 2 seconds. Invisible to screen-share. Just a confident you.", color: "bg-cyan-600", border: "border-cyan-500/20 bg-cyan-500/5" },
  ];
  return (
    <section className="py-24 px-6 overflow-hidden bg-white">
      <div className="max-w-5xl mx-auto">
        <FadeUp className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">3 steps. Then you win.</h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">No complex setup. Upload, open, ace.</p>
        </FadeUp>
        <div ref={ref} className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-2xl border ${s.border} p-8 group hover:-translate-y-1 transition-all duration-300`}>
              <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white font-black text-base mb-5 shadow-lg`}>{s.n}</div>
              <div className="text-2xl mb-3">{s.icon}</div>
              <h3 className="text-lg font-black text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA ────────────────────────────────────────────────────── */
export function CtaSection({ onNav }: { onNav: (p: string) => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section className="py-24 px-6 overflow-hidden bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <motion.div ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div className="relative rounded-2xl overflow-hidden border border-violet-200 p-12 md:p-16 text-center"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.1) 50%, rgba(6,182,212,0.08) 100%)" }}>
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 mb-6 uppercase tracking-widest hidden">Start Free Today</span>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
                Your dream job is<br />one interview away.
              </h2>
              <p className="text-gray-600 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                Join 50,000+ job seekers who use CoopilotX to walk into every interview with total confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => onNav("mock-interview")}
                  className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] transition-all duration-300 text-base">
                  Start for free →
                </button>
                <button onClick={() => onNav("pricing")}
                  className="px-8 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-bold rounded-xl transition-all duration-300 text-base">
                  See pricing
                </button>
              </div>
              <p className="mt-6 text-gray-400 text-xs">No credit card. Free mock interviews. Cancel anytime.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
