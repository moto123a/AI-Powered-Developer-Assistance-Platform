"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FadeUp, Counter } from "./shared";

const STORIES = [
  {
    name: "Aarav Mehta", role: "SDE-2 @ Google", initials: "AM",
    grad: "from-indigo-500 to-violet-600",
    metric: "+34%", metricLabel: "salary increase",
    quote: "3 weeks of mock practice, then used the stealth overlay in my real Google loop. Got the offer and a $48K bump in total comp.",
    tags: ["Mock Interview", "Live Copilot"],
  },
  {
    name: "Priya Sharma", role: "PM @ Microsoft", initials: "PS",
    grad: "from-violet-500 to-pink-500",
    metric: "4 offers", metricLabel: "in 3 weeks",
    quote: "The resume builder rewrote my CV overnight. Then I practiced every behavioral with mock mode. Microsoft, Google, Meta, Stripe. All called back.",
    tags: ["Resume Builder", "Mock Interview"],
  },
  {
    name: "Arjun Nair", role: "ML Engineer @ Meta", initials: "AN",
    grad: "from-cyan-500 to-blue-600",
    metric: "$220K", metricLabel: "total comp",
    quote: "Went from 0 recruiter responses to a $220K Meta offer in 6 weeks. CoopilotX is the unfair advantage everyone needs but nobody talks about.",
    tags: ["Live Copilot", "Resume Builder"],
  },
];

const BOTTOM_STATS = [
  { n: 50000, suf: "+", pre: "", label: "interviews assisted" },
  { n: 87,    suf: "%", pre: "", label: "offer rate (5+ sessions)" },
  { n: 38,    suf: "K", pre: "$", label: "avg salary increase" },
  { n: 49,    suf: "/5", pre: "4.", label: "user satisfaction" },
];

export default function SuccessSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-28 px-6 overflow-hidden bg-gray-950">
      <div className="max-w-6xl mx-auto">
        <FadeUp className="text-center mb-20">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 mb-4 uppercase tracking-widest">Success Stories</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">Real people. Real offers.</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Thousands of CoopilotX users have landed dream jobs at top companies, with bigger salaries and more confidence.
          </p>
        </FadeUp>

        <div ref={ref} className="grid md:grid-cols-3 gap-6">
          {STORIES.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 60, rotateX: 8 }}
              animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl border border-white/10 bg-white/5 p-8 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col"
              style={{ perspective: 1000 }}>
              <div className="inline-flex items-baseline gap-2 mb-5">
                <span className={`text-4xl font-black bg-gradient-to-r ${s.grad} bg-clip-text text-transparent`}>{s.metric}</span>
                <span className="text-sm font-semibold text-gray-400">{s.metricLabel}</span>
              </div>
              <p className="text-gray-400 leading-relaxed text-sm flex-1 mb-6">&ldquo;{s.quote}&rdquo;</p>
              <div className="flex gap-2 flex-wrap mb-6">
                {s.tags.map((t, j) => (
                  <span key={j} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-gray-400 uppercase tracking-wide">{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-5 border-t border-white/10">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${s.grad} flex items-center justify-center text-white text-sm font-black shadow-md group-hover:scale-110 transition-transform`}>{s.initials}</div>
                <div>
                  <p className="text-sm font-black text-white">{s.name}</p>
                  <p className="text-[11px] text-gray-500 font-medium">{s.role}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[1,2,3,4,5].map(k => (
                    <svg key={k} className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <FadeUp delay={0.35} className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {BOTTOM_STATS.map((m, i) => (
              <div key={i}>
                <div className="text-2xl font-black text-white mb-1">
                  <Counter to={m.n} prefix={m.pre} suffix={m.suf} />
                </div>
                <div className="text-xs text-gray-400 font-medium">{m.label}</div>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
