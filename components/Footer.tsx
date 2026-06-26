"use client";
import { motion } from "framer-motion";
import Link from "next/link";

const PRODUCT_LINKS = [
  { label: "Resume Builder",  href: "/resume" },
  { label: "Mock Interview",  href: "/mock-interview" },
  { label: "Real-Time AI",    href: "/real-interview" },
  { label: "Pricing",         href: "/pricing" },
];

const COMPANY_LINKS = [
  { label: "Features",        href: "/features" },
  { label: "How It Works",    href: "/how-it-works" },
  { label: "Privacy Policy",  href: "/privacy" },
  { label: "Terms of Service",href: "/terms" },
];

const TRUST_BADGES = [
  "Zero audio stored",
  "Screen-share safe",
  "No data sold, ever",
  "Cancel anytime",
];

export default function Footer() {
  return (
    <footer className="bg-[#06060f] text-white border-t border-white/[0.05]">

      {/* Main grid */}
      <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">

        {/* Brand column */}
        <div className="md:col-span-1">
          <Link href="/" className="inline-flex items-center gap-1 mb-4">
            <span className="text-[15px] font-black text-white tracking-tight">
              CoopilotX{" "}
              <span style={{ background: "linear-gradient(135deg,#a78bfa,#fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                AI
              </span>
            </span>
          </Link>
          <p className="text-[13px] text-white/30 leading-relaxed mb-5 max-w-[200px]">
            The interview co-pilot that knows your resume, answers in 1.8 seconds, and stays completely invisible.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-white/20">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 block" />
            All systems operational
          </div>
        </div>

        {/* Product links */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-white/25 mb-4">Product</p>
          <ul className="space-y-2.5">
            {PRODUCT_LINKS.map(l => (
              <li key={l.href}>
                <Link href={l.href}
                  className="text-[13px] text-white/40 hover:text-white/80 transition-colors duration-150">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company links */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-white/25 mb-4">Company</p>
          <ul className="space-y-2.5">
            {COMPANY_LINKS.map(l => (
              <li key={l.href}>
                <Link href={l.href}
                  className="text-[13px] text-white/40 hover:text-white/80 transition-colors duration-150">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact + trust */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-white/25 mb-4">Support</p>
          <a href="mailto:support@coopilotxai.com"
            className="inline-flex items-center gap-2 text-[13px] text-violet-400 hover:text-violet-300 transition-colors mb-6">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@coopilotxai.com
          </a>

          <div className="space-y-2">
            {TRUST_BADGES.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-white/25">
                <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/20">
            &copy; {new Date().getFullYear()} CoopilotX AI. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms",   href: "/terms" },
              { label: "Cookies", href: "/cookies" },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="text-[11px] text-white/25 hover:text-white/60 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

    </footer>
  );
}
