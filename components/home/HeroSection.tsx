"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface Props {
  mounted: boolean;
  detectedOS: "win" | "mac" | "other";
  onDownload: (os: "win" | "mac") => void;
  onNav: (path: string) => void;
}

function WinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>
  );
}
function MacIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>
  );
}

export function OSDownloadButtons({ detectedOS, mounted, onDownload, size = "default" }: {
  detectedOS: "win" | "mac" | "other"; mounted: boolean;
  onDownload: (os: "win" | "mac") => void; size?: "default" | "large";
}) {
  const cls = size === "large"
    ? "px-8 py-4 text-base font-bold rounded-2xl gap-3"
    : "px-6 py-3 text-sm font-bold rounded-xl gap-2.5";
  if (!mounted) return (
    <div className={`flex flex-col sm:flex-row gap-3 justify-center`}>
      <button onClick={() => onDownload("win")} className={`flex items-center justify-center ${cls} bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_24px_rgba(99,102,241,0.4)] transition-all`}>
        <WinIcon className="w-5 h-5" /> Download for Windows
        <span className="text-[10px] font-black bg-indigo-500 px-2 py-0.5 rounded-full">FREE</span>
      </button>
    </div>
  );
  const primaryWin = (
    <button onClick={() => onDownload("win")} className={`flex items-center justify-center ${cls} bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_24px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_32px_rgba(99,102,241,0.55)] transition-all active:scale-[0.97]`}>
      <WinIcon className="w-5 h-5 flex-shrink-0" /><span>Download for Windows</span>
      <span className="text-[10px] font-black bg-indigo-500/60 px-2 py-0.5 rounded-full">FREE</span>
    </button>
  );
  const primaryMac = (
    <button onClick={() => onDownload("mac")} className={`flex items-center justify-center ${cls} bg-gray-800 hover:bg-gray-700 text-white shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_32px_rgba(0,0,0,0.4)] transition-all active:scale-[0.97]`}>
      <MacIcon className="w-5 h-5 flex-shrink-0" /><span>Download for macOS</span>
      <span className="text-[10px] font-black bg-gray-600 px-2 py-0.5 rounded-full">FREE</span>
    </button>
  );
  const secondaryWin = (
    <button onClick={() => onDownload("win")} className={`flex items-center justify-center ${cls} bg-white/10 border border-white/20 hover:bg-white/15 text-white transition-all active:scale-[0.97]`}>
      <WinIcon className="w-5 h-5 flex-shrink-0" /><span>Also on Windows</span>
    </button>
  );
  const secondaryMac = (
    <button onClick={() => onDownload("mac")} className={`flex items-center justify-center ${cls} bg-white/10 border border-white/20 hover:bg-white/15 text-white transition-all active:scale-[0.97]`}>
      <MacIcon className="w-5 h-5 flex-shrink-0" /><span>Also on macOS</span>
    </button>
  );
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      {detectedOS === "win" ? <>{primaryWin}{secondaryMac}</> : detectedOS === "mac" ? <>{primaryMac}{secondaryWin}</> : <>{primaryWin}{primaryMac}</>}
    </div>
  );
}

export default function HeroSection({ mounted, detectedOS, onDownload, onNav }: Props) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const rawY  = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const mockY = useSpring(rawY, { stiffness: 60, damping: 20 });

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0e27 0%, #0d1b4e 40%, #0a1030 100%)" }}>

      {/* GitHub-style grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      {/* Top purple glow - GitHub style */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.35) 0%, rgba(99,102,241,0.15) 40%, transparent 70%)" }} />

      {/* Side ambient glows */}
      <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute top-1/3 -right-48 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)", filter: "blur(60px)" }} />

      {/* Horizontal glow line - GitHub signature element */}
      <div className="absolute left-0 right-0 pointer-events-none" style={{ top: "55%" }}>
        <div style={{ height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.3) 30%, rgba(99,102,241,0.5) 50%, rgba(139,92,246,0.3) 70%, transparent 100%)" }} />
      </div>

      <div className="relative w-full max-w-5xl mx-auto px-6 text-center pt-20 pb-12">

        {/* OS badge */}
        {mounted && detectedOS !== "other" && (
          <motion.button initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            onClick={() => document.getElementById("download-section")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium text-gray-300 hover:bg-white/10 transition-all">
            {detectedOS === "win" ? <WinIcon className="w-4 h-4 text-blue-400" /> : <MacIcon className="w-4 h-4 text-gray-300" />}
            <span>Available for <strong className="text-white">{detectedOS === "win" ? "Windows" : "macOS"}</strong></span>
            <span className="bg-violet-500/30 text-violet-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-500/30">Free</span>
          </motion.button>
        )}

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6 text-white">
          Ace every interview.<br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Land the offer.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
          className="text-lg md:text-xl text-gray-400 leading-relaxed mb-10 max-w-2xl mx-auto">
          Real-time AI listens to your interview, reads your resume, and streams a{" "}
          <span className="text-violet-400 font-semibold">perfect answer in under 2 seconds</span>
          {" "}— invisible to your interviewer.
        </motion.p>

        {/* Primary CTAs */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button onClick={() => onNav("mock-interview")}
            className="relative group px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-base rounded-lg shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] transition-all active:scale-[0.98] overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">
              Get started free
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>
          <button onClick={() => document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-3.5 bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 text-white font-semibold text-base rounded-lg transition-all">
            Watch demo
          </button>
        </motion.div>

        {/* Download buttons */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <OSDownloadButtons detectedOS={detectedOS} mounted={mounted} onDownload={onDownload} size="default" />
          <p className="text-[12px] text-gray-600 mt-3">Free forever · No credit card · Windows & Mac</p>
        </motion.div>

        {/* Social proof */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="flex items-center justify-center gap-4 mt-10">
          <div className="flex -space-x-2">
            {["AM","PS","RK","SI","AN"].map((ini, i) => (
              <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#0a1030] bg-gradient-to-br ${["from-violet-500 to-indigo-600","from-indigo-500 to-blue-600","from-cyan-500 to-blue-600","from-emerald-500 to-teal-600","from-pink-500 to-rose-600"][i]} flex items-center justify-center text-[10px] font-bold text-white`}>
                {ini}
              </div>
            ))}
          </div>
          <div className="text-left">
            <div className="text-yellow-400 text-xs leading-none mb-0.5">★★★★★</div>
            <p className="text-[12px] text-gray-500"><span className="text-gray-300 font-semibold">50,000+</span> job seekers trust CoopilotX</p>
          </div>
        </motion.div>
      </div>

      {/* Hero product mockup */}
      <motion.div
        style={{ y: mockY }}
        initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-4xl mx-auto px-6 pb-0">
        <div className="relative rounded-t-2xl overflow-hidden border border-white/10 shadow-[0_-8px_60px_rgba(139,92,246,0.15)]">
          {/* Window bar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-white/10">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 mx-4 bg-white/5 rounded-md h-6 flex items-center px-3 border border-white/10">
              <span className="text-[10px] text-gray-500">CoopilotX — Stealth Overlay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400 font-semibold">LIVE</span>
            </div>
          </div>
          {/* Mock UI */}
          <div className="bg-[#0d1117] p-6 space-y-4 min-h-[200px]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#161b22] border border-white/10 flex items-center justify-center text-base flex-shrink-0">🎤</div>
              <div className="flex-1 bg-[#161b22] border border-white/10 rounded-xl px-4 py-3">
                <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Interviewer</p>
                <p className="text-sm text-gray-200">"Tell me about a time you led a high-pressure project."</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pl-4">
              <div className="flex-1 bg-gradient-to-br from-violet-600/20 to-indigo-600/10 border border-violet-500/20 rounded-xl px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  <span className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">CoopilotX — AI Answer (1.8s)</span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">"In my last role at [Company], I led a 5-person team to ship a critical API migration under a 3-week deadline. I set up daily standups, unblocked dependencies, and we delivered on time — reducing latency by 40%."</p>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom fade */}
        <div className="h-24 bg-gradient-to-b from-transparent to-[#0a1030] -mt-24 relative pointer-events-none" />
      </motion.div>

    </section>
  );
}
