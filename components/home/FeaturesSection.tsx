"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FadeUp } from "./shared";

const FEATURES = [
  { icon: "🕵️", title: "Stealth Overlay",       desc: "Invisible to screen-share on Zoom, Teams, Meet. Your secret weapon during real interviews.",             color: "bg-indigo-50 border-indigo-100",   iconBg: "bg-indigo-500",  tag: "Most loved" },
  { icon: "📋", title: "Resume-Grounded AI",    desc: "Every answer uses YOUR actual experience and projects. Zero generic filler, ever.",                        color: "bg-violet-50 border-violet-100",   iconBg: "bg-violet-500",  tag: "" },
  { icon: "⚡", title: "Sub-2-Second Speed",    desc: "Groq LPU inference streams the perfect answer before you even finish thinking about it.",                 color: "bg-amber-50 border-amber-100",     iconBg: "bg-amber-500",   tag: "Fastest" },
  { icon: "🌐", title: "Any Platform",          desc: "Works with Zoom, Google Meet, Teams, Webex, HireVue — anything that uses your microphone.",               color: "bg-sky-50 border-sky-100",         iconBg: "bg-sky-500",     tag: "" },
  { icon: "🧠", title: "Mock Interview Mode",   desc: "200+ AI questions for your exact role. Practice until every answer is pitch-perfect.",                    color: "bg-emerald-50 border-emerald-100", iconBg: "bg-emerald-500", tag: "Popular" },
  { icon: "📝", title: "AI Resume Builder",     desc: "Build an ATS-optimized resume in minutes, then use it to power your live interview answers.",             color: "bg-rose-50 border-rose-100",       iconBg: "bg-rose-500",    tag: "" },
  { icon: "🔒", title: "100% Private",          desc: "Audio never stored. Text-only prompts sent to AI. Zero conversation logs. Your data stays yours.",        color: "bg-teal-50 border-teal-100",       iconBg: "bg-teal-500",    tag: "" },
  { icon: "🖥️", title: "Native Desktop App",   desc: "Windows + Mac native apps. System audio capture for true stealth. Zero browser limitations.",            color: "bg-pink-50 border-pink-100",       iconBg: "bg-pink-500",    tag: "New" },
  { icon: "🎯", title: "Role-Specific Answers", desc: "SWE, PM, Data Science, Marketing — answers precision-tuned for your exact target role.",                 color: "bg-purple-50 border-purple-100",   iconBg: "bg-purple-500",  tag: "" },
];

export default function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-28 px-6 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <FadeUp className="text-center mb-20">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 mb-4 uppercase tracking-widest">Features</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">Everything you need to win.</h2>
          <p className="text-gray-400 text-lg max-w-lg mx-auto">Every feature was built because a real user needed it to land their dream job.</p>
        </FadeUp>

        <div ref={ref} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className={`relative bg-[#0d1117] rounded-2xl border-2 ${f.color} p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}>
              {f.tag && (
                <span className={`absolute top-4 right-4 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white ${f.iconBg}`}>
                  {f.tag}
                </span>
              )}
              <div className={`w-12 h-12 rounded-xl ${f.iconBg} flex items-center justify-center text-2xl mb-4 shadow-md group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                {f.icon}
              </div>
              <h3 className="text-base font-black text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
