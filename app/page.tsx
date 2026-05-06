"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, updateDoc, arrayUnion, collection, addDoc } from "firebase/firestore";
import CreditsBadge from "../components/CreditsBadge";
import Footer from "../components/Footer";

import HeroSection from "../components/home/HeroSection";
import DownloadSection from "../components/home/DownloadSection";
import WhatIsItSection from "../components/home/WhatIsItSection";
import DemoSection from "../components/home/DemoSection";
import FeaturesSection from "../components/home/FeaturesSection";
import SuccessSection from "../components/home/SuccessSection";
import TestimonialsSection from "../components/home/TestimonialsSection";
import {
  TrustedBySection, StatsSection,
  HowItWorksSection, CtaSection,
} from "../components/home/MidSections";

const WINDOWS_DOWNLOAD = "/app.msixbundle";
const MAC_DOWNLOAD     = "/InterviewCopilotMac-1.0.0.pkg";

export default function Home() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [detectedOS, setDetectedOS] = useState<"win" | "mac" | "other">("other");
  const menuRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const headerBg = useTransform(scrollYProgress, [0, 0.05], ["rgba(10,14,39,0.6)", "rgba(10,14,39,0.97)"]);

  useEffect(() => {
    // dark theme - no light-page class needed
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua))  setDetectedOS("win");
    else if (/Mac/i.test(ua)) setDetectedOS("mac");
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { const u = onAuthStateChanged(auth, setUser); return () => u(); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  useEffect(() => {
    if (!document.querySelector('link[href*="Inter"]')) {
      const l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const go = (path: string) => {
    if (!user && path !== "pricing" && path !== "resume") {
      router.push("/login?redirect=/" + path); return;
    }
    router.push("/" + path);
  };

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = "coopilotx_session=; path=/; max-age=0";
    setUser(null); setShowMenu(false); router.push("/login");
  };

  const download = async (os: "win" | "mac") => {
    const a = document.createElement("a");
    a.href     = os === "win" ? WINDOWS_DOWNLOAD : MAC_DOWNLOAD;
    a.download = os === "win" ? "app.msixbundle" : "InterviewCopilotMac-1.0.0.pkg";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    const entry = { os, at: new Date().toISOString(), email: user?.email || "anonymous" };
    try {
      await addDoc(collection(db, "app_downloads"), entry);
      if (user?.uid) await updateDoc(doc(db, "users", user.uid), { appDownloads: arrayUnion(entry) });
    } catch (e) { console.error("Download tracking:", e); }
  };

  return (
    <main className="bg-white text-gray-900 overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      <motion.div
        className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500"
        style={{ scaleX: scrollYProgress, transformOrigin: "0%" }}
      />

      <motion.header style={{ backgroundColor: headerBg as any }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <div className="flex items-center gap-2.5 mr-8 cursor-pointer" onClick={() => router.push("/")}>
            <img src="/logo.jpeg" alt="CoopilotX" className="w-7 h-7 rounded-lg shadow-sm" />
            <span className="text-[15px] font-bold tracking-tight text-white">
              CoopilotX{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">AI</span>
            </span>
          </div>
          <div className="hidden md:block w-px h-4 bg-white/10 mr-5" />
          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            {[
              { label: "Resume",         path: "resume" },
              { label: "Mock Interview", path: "mock-interview" },
              { label: "Real-Time",      path: "real-interview" },
              { label: "Pricing",        path: "pricing" },
            ].map(item => (
              <button key={item.path} onClick={() => go(item.path)}
                className="px-3.5 py-1.5 text-[13px] font-medium text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all">
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 ml-auto">
            <CreditsBadge />
            {!user ? (
              <>
                <button onClick={() => router.push("/login?mode=signin")}
                  className="px-4 py-1.5 text-[13px] font-medium text-gray-400 hover:text-white transition-colors">
                  Log in
                </button>
                <button onClick={() => router.push("/login?mode=signup")}
                  className="px-4 py-1.5 text-[13px] font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all shadow-sm">
                  Get started free
                </button>
              </>
            ) : (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(!showMenu)} className="focus:outline-none">
                  <img
                    src={user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border-2 border-indigo-200 hover:border-indigo-400 transition-colors"
                  />
                </button>
                {showMenu && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-56 bg-[#161b22] border border-white/10 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                      <p className="text-sm font-semibold text-white truncate">{user.displayName || user.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>
                    </div>
                    <button onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* ── RESUME BUILDER SECTION ── */}
      {/*
        In your WhatIsItSection (or wherever "Build My Resume" lives),
        update the buttons to use these classes:

        PRIMARY — Build My Resume:
          className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-bold
                     bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                     text-white rounded-xl transition-all shadow-lg shadow-indigo-500/30"

        SECONDARY — Mock Interview & Real-Time:
          className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-bold
                     border-2 border-indigo-600 text-indigo-600
                     hover:bg-indigo-50 active:bg-indigo-100
                     rounded-xl transition-all"

        If the buttons live inline in this file, they are shown below as an example:
      */}

      {/*
        EXAMPLE — if you have inline CTA buttons anywhere in this file, replace them like this:

        BEFORE (invisible):
        <button onClick={() => go("resume")}
          className="px-6 py-3 text-sm font-semibold border border-gray-300 rounded-lg ...">
          Build My Resume →
        </button>

        AFTER (clearly visible primary):
        <button onClick={() => go("resume")}
          className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-bold
                     bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                     text-white rounded-xl transition-all shadow-lg shadow-indigo-500/30">
          Build My Resume →
        </button>

        AFTER (clearly visible secondary):
        <button onClick={() => go("mock-interview")}
          className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-bold
                     border-2 border-indigo-600 text-indigo-600
                     hover:bg-indigo-50 rounded-xl transition-all">
          Start Mock Interview →
        </button>

        <button onClick={() => go("real-interview")}
          className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-bold
                     border-2 border-indigo-600 text-indigo-600
                     hover:bg-indigo-50 rounded-xl transition-all">
          Try Real-Time →
        </button>
      */}

      <HeroSection mounted={mounted} detectedOS={detectedOS} onDownload={download} onNav={go} />
      <TrustedBySection />
      <StatsSection />
      <WhatIsItSection onNav={go} />
      <DemoSection onNav={go} />
      <HowItWorksSection />
      <FeaturesSection />
      <SuccessSection />
      <TestimonialsSection />
      <DownloadSection mounted={mounted} detectedOS={detectedOS} onDownload={download} />
      <CtaSection onNav={go} />
      <Footer />

    </main>
  );
}