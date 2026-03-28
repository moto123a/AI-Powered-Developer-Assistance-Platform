"use client";
import CreditsBadge from "../components/CreditsBadge";
import { motion, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import AuthModal from "../components/AuthModal";
import Footer from "../components/Footer";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// --- UPDATED DIRECT DOWNLOAD PATH ---
// We point directly to the .msixbundle file because Microsoft blocked the ms-appinstaller protocol link
const WINDOWS_DOWNLOAD_FILE = "/app.msixbundle";
const MAC_URL = "/InterviewCopilotMac-1.0.0.pkg";

export default function Home() {
  const router = useRouter();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 30, damping: 20 });
  const smoothY = useSpring(y, { stiffness: 30, damping: 20 });

  const { scrollYProgress } = useScroll();
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  // Load Font Awesome
  useEffect(() => {
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
      document.head.appendChild(link);
    }
  }, []);

  // Performance data
  const performanceData = useMemo(
    () => [
      { month: "Jan", success: 65, confidence: 55 },
      { month: "Feb", success: 72, confidence: 68 },
      { month: "Mar", success: 78, confidence: 75 },
      { month: "Apr", success: 85, confidence: 82 },
      { month: "May", success: 90, confidence: 88 },
      { month: "Jun", success: 95, confidence: 94 },
    ],
    []
  );

  // --- Groq LLaMA token streaming throughput (tokens/sec) ---
  const aiMetrics = useMemo(
    () => [
      { time: "0s", tokens: 0 },
      { time: "0.2s", tokens: 55 },
      { time: "0.4s", tokens: 120 },
      { time: "0.6s", tokens: 185 },
      { time: "0.8s", tokens: 230 },
      { time: "1s", tokens: 250 },
    ],
    []
  );

  // Theme
  const theme = {
    bg: isDark ? "bg-slate-950" : "bg-white",
    text: isDark ? "text-slate-50" : "text-slate-900",
    textSecondary: isDark ? "text-slate-400" : "text-slate-600",
    card: isDark ? "from-slate-900/90 to-slate-800/90" : "from-slate-50 to-slate-100",
    border: isDark ? "border-slate-800/50" : "border-slate-200",
    headerBg: isDark ? "bg-slate-950/95" : "bg-white/95",
    navLink: isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900",
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setShowMenu(false);
  };

  useEffect(() => {
    let rafId: number | null = null;
    const move = (e: MouseEvent) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const cx = e.clientX - window.innerWidth / 2;
        const cy = e.clientY - window.innerHeight / 2;
        x.set(cx / 50);
        y.set(cy / 50);
        setMouse({ x: e.clientX, y: e.clientY });
        rafId = null;
      });
    };
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mousemove", move);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [x, y]);

  const handleClick = (path: string) => {
    if (path === "real-interview" && !user) {
      setShowAuthModal(true);
      return;
    }
    router.push(`/${path}`);
  };

  // --- UPDATED DOWNLOAD LOGIC ---
  const handleDownload = (os: "windows" | "mac") => {
    const link = document.createElement("a");
    if (os === "windows") {
      // Direct Download logic for Modern Windows Installer
      link.href = WINDOWS_DOWNLOAD_FILE;
      link.download = "app.msixbundle";
    } else {
      // Logic for Mac (remains as file download)
      link.href = MAC_URL;
      link.download = "InterviewCopilotMac-1.0.0.pkg";
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className={`relative flex flex-col items-center font-sans transition-colors duration-500 ${theme.bg} ${theme.text}`}>

      {/* ── Animated Background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none will-change-transform">
        <motion.div
          style={{ y: scrollY }}
          animate={{
            background: isDark
              ? [
                  "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)",
                  "radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)",
                  "radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)",
                  "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)",
                ]
              : [
                  "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)",
                  "radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.12) 0%, transparent 50%)",
                  "radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)",
                  "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)",
                ],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        />
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [0, 50]) }}
          animate={{
            background: isDark
              ? [
                  "radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.15) 0%, transparent 60%)",
                  "radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 60%)",
                  "radial-gradient(circle at 60% 40%, rgba(168, 85, 247, 0.15) 0%, transparent 60%)",
                  "radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.15) 0%, transparent 60%)",
                ]
              : [
                  "radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.1) 0%, transparent 60%)",
                  "radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 60%)",
                  "radial-gradient(circle at 60% 40%, rgba(168, 85, 247, 0.1) 0%, transparent 60%)",
                  "radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.1) 0%, transparent 60%)",
                ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        />
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [0, -50]) }}
          className={`absolute inset-0 ${isDark ? "opacity-[0.07]" : "opacity-[0.12]"}`}
          animate={{ backgroundPosition: ["0px 0px", "60px 60px"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage: isDark
                ? `linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`
                : `linear-gradient(rgba(59, 130, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </motion.div>
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [0, 30]) }}
          className={`absolute inset-0 ${isDark ? "opacity-[0.03]" : "opacity-[0.06]"}`}
          animate={{ x: [0, 20] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage: isDark
                ? "repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.5) 0px, transparent 2px, transparent 10px, rgba(168, 85, 247, 0.5) 12px)"
                : "repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.6) 0px, transparent 2px, transparent 10px, rgba(168, 85, 247, 0.6) 12px)",
            }}
          />
        </motion.div>
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [0, -80]) }}
          className={`absolute inset-0 ${isDark ? "opacity-[0.04]" : "opacity-[0.08]"}`}
          animate={{ backgroundPosition: ["0px 0px", "40px 40px"] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage: isDark
                ? "radial-gradient(circle, rgba(59, 130, 246, 0.6) 1px, transparent 1px)"
                : "radial-gradient(circle, rgba(59, 130, 246, 0.8) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </motion.div>

        {[
          { icon: "fa-brain", color: "text-purple-400", size: "text-6xl", left: "10%", top: "15%" },
          { icon: "fa-robot", color: "text-blue-400", size: "text-7xl", left: "85%", top: "25%" },
          { icon: "fa-microchip", color: "text-cyan-400", size: "text-5xl", left: "15%", top: "60%" },
          { icon: "fa-code", color: "text-pink-400", size: "text-6xl", left: "80%", top: "70%" },
          { icon: "fa-laptop-code", color: "text-indigo-400", size: "text-7xl", left: "50%", top: "40%" },
          { icon: "fa-network-wired", color: "text-emerald-400", size: "text-5xl", left: "20%", top: "85%" },
          { icon: "fa-database", color: "text-blue-300", size: "text-6xl", left: "70%", top: "10%" },
          { icon: "fa-server", color: "text-purple-300", size: "text-5xl", left: "40%", top: "75%" },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="fixed will-change-transform"
            style={{
              left: item.left,
              top: item.top,
              y: useTransform(scrollYProgress, [0, 1], [0, i % 2 === 0 ? -300 : 300]),
              opacity: isDark ? 0.08 : 0.05,
            }}
            animate={{ y: [0, -40, 0], rotate: [0, 360], scale: [1, 1.2, 1] }}
            transition={{ duration: 15 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
          >
            <i
              className={`fa-solid ${item.icon} ${item.size} ${item.color}`}
              style={{
                filter: "blur(1px)",
                textShadow: isDark
                  ? "0 0 30px currentColor, 0 0 60px currentColor"
                  : "0 0 20px currentColor, 0 0 40px currentColor",
              }}
            />
          </motion.div>
        ))}

        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`shape-${i}`}
            className="fixed"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 30}%`,
              y: useTransform(scrollYProgress, [0, 1], [0, i % 2 === 0 ? -200 : 200]),
              opacity: isDark ? 0.06 : 0.04,
            }}
            animate={{ rotate: [0, 360], scale: [1, 1.3, 1] }}
            transition={{ duration: 20 + i * 3, repeat: Infinity, ease: "linear" }}
          >
            <div
              className={`w-32 h-32 ${i % 3 === 0 ? "rounded-xl" : i % 3 === 1 ? "rounded-full" : "rounded-3xl"}`}
              style={{
                background:
                  i % 3 === 0
                    ? isDark ? "linear-gradient(135deg, rgba(59,130,246,0.15),rgba(168,85,247,0.15))" : "linear-gradient(135deg, rgba(59,130,246,0.1),rgba(168,85,247,0.1))"
                    : i % 3 === 1
                    ? isDark ? "linear-gradient(135deg, rgba(168,85,247,0.15),rgba(236,72,153,0.15))" : "linear-gradient(135deg, rgba(168,85,247,0.1),rgba(236,72,153,0.1))"
                    : isDark ? "linear-gradient(135deg, rgba(236,72,153,0.15),rgba(59,130,246,0.15))" : "linear-gradient(135deg, rgba(236,72,153,0.1),rgba(59,130,246,0.1))",
                filter: "blur(2px)",
                transform: `perspective(1000px) rotateX(${i * 15}deg) rotateY(${i * 20}deg)`,
              }}
            />
          </motion.div>
        ))}

        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [0, -100]) }}
          className={`absolute inset-0 ${isDark ? "opacity-[0.05]" : "opacity-[0.08]"}`}
        >
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={`circuit-${i}`}
              className="absolute"
              style={{
                left: `${i * 10}%`,
                top: `${(i % 3) * 30}%`,
                width: "2px",
                height: `${100 + i * 20}px`,
                background: isDark
                  ? "linear-gradient(180deg, rgba(59,130,246,0.3), transparent)"
                  : "linear-gradient(180deg, rgba(59,130,246,0.4), transparent)",
              }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </motion.div>
      </div>

      {/* Floating Particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="fixed rounded-full will-change-transform"
          style={{
            width: Math.random() * 8 + 4,
            height: Math.random() * 8 + 4,
            left: `${10 + i * 8}%`,
            top: `${15 + (i % 4) * 20}%`,
            background:
              i % 4 === 0 ? (isDark ? "rgba(59,130,246,0.6)" : "rgba(59,130,246,0.4)")
              : i % 4 === 1 ? (isDark ? "rgba(168,85,247,0.6)" : "rgba(168,85,247,0.4)")
              : i % 4 === 2 ? (isDark ? "rgba(236,72,153,0.6)" : "rgba(236,72,153,0.4)")
              : (isDark ? "rgba(34,211,238,0.6)" : "rgba(34,211,238,0.4)"),
            y: useTransform(scrollYProgress, [0, 1], [0, i % 2 === 0 ? -250 : 250]),
            boxShadow: isDark ? "0 0 20px currentColor" : "0 0 15px currentColor",
          }}
          animate={{ y: [0, -150, 0], x: [0, Math.sin(i) * 40, 0], opacity: [0.3, 1, 0.3], scale: [1, 1.8, 1] }}
          transition={{ duration: 12 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}

      {/* ── HEADER ── */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={`fixed top-0 left-0 right-0 z-50 ${theme.border} border-b ${theme.headerBg} backdrop-blur-xl will-change-transform`}
      >
        <div className="max-w-7xl mx-auto px-6 py-0 flex items-center h-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.04 }}
            className="flex items-center gap-2.5 cursor-pointer mr-8 flex-shrink-0"
          >
            <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-8 h-8 relative">
              <img src="/logo.jpeg" alt="CoopilotX Logo" className="w-full h-full object-contain rounded-md" />
            </motion.div>
            <span className={`text-[15px] font-bold tracking-tight whitespace-nowrap ${theme.text}`}>
              CoopilotX <span className="text-blue-400">AI</span>
            </span>
          </motion.div>

          <div className={`hidden md:block w-px h-5 ${isDark ? "bg-slate-700" : "bg-slate-300"} mr-6`} />

          <nav className="hidden md:flex items-center gap-1 flex-1">
            {[
              { label: "Resume", path: "resume" },
              { label: "Mock Interview", path: "mock-interview" },
              { label: "Real-Time Interview", path: "real-interview" },
              { label: "Pricing", path: "pricing" },
              { label: "Analytics", path: "analytics" },
              { label: "Docs", path: "docs" },
            ].map((item) => (
              <motion.button
                key={item.path}
                onClick={() => handleClick(item.path)}
                className={`
                  relative px-3.5 py-1.5 text-[13.5px] font-medium rounded-md transition-all duration-150
                  ${theme.navLink}
                  ${isDark ? "hover:bg-slate-800/80" : "hover:bg-slate-100"}
                  group
                `}
                style={{ letterSpacing: "0.01em" }}
              >
                {item.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-blue-500 rounded-full transition-all duration-200 group-hover:w-3/4" />
              </motion.button>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <CreditsBadge />
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-md transition-colors ${isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}
              aria-label="Toggle theme"
            >
              {isDark ? <i className="fa-solid fa-sun text-[14px]" /> : <i className="fa-solid fa-moon text-[14px]" />}
            </motion.button>

            <div className={`w-px h-5 ${isDark ? "bg-slate-700" : "bg-slate-300"}`} />

            {!user ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96, y: 2 }}
                  onClick={() => setShowAuthModal(true)}
                  className={`px-4 py-[7px] text-[13px] font-semibold rounded-md border transition-all duration-150 ${
                    isDark
                      ? "border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white hover:bg-slate-800"
                      : "border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                  style={{
                    boxShadow: isDark
                      ? "0 1px 0 rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.03)"
                      : "0 1px 0 rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
                  }}
                >
                  Log in
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: "0 4px 20px rgba(59,130,246,0.45)" }}
                  whileTap={{ scale: 0.96, y: 2 }}
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-[7px] bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold rounded-md transition-all duration-150"
                  style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 8px rgba(59,130,246,0.35)" }}
                >
                  Get started
                </motion.button>
              </>
            ) : (
              <div className="relative" ref={menuRef}>
                <motion.button
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowMenu(!showMenu)}
                  className="focus:outline-none"
                >
                  <img
                    src={user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border-2 border-blue-500/50 hover:border-blue-500 transition-colors"
                  />
                </motion.button>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`absolute right-0 mt-3 w-64 ${isDark ? "bg-slate-900/95" : "bg-white/95"} backdrop-blur-xl border ${theme.border} rounded-xl shadow-2xl overflow-hidden`}
                  >
                    <div className={`p-4 border-b ${theme.border} bg-gradient-to-br from-blue-500/10 to-purple-500/10`}>
                      <p className={`text-sm font-semibold truncate ${theme.text}`}>{user.displayName || user.email}</p>
                      <p className={`text-xs ${theme.textSecondary} mt-1 truncate`}>{user.email}</p>
                    </div>
                    <motion.button
                      whileHover={{ backgroundColor: isDark ? "rgba(30,41,59,1)" : "rgba(241,245,249,1)" }}
                      onClick={handleLogout}
                      className={`w-full text-left px-4 py-3 text-sm ${theme.textSecondary}`}
                    >
                      Sign Out
                    </motion.button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 pt-32 pb-20">
        <div className="max-w-6xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI-Powered Interview Copilot — Now Available
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-none"
          >
            <span className={theme.text}>Ace Every</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Interview
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className={`text-lg md:text-xl max-w-3xl mx-auto mb-6 leading-relaxed ${theme.textSecondary}`}
          >
            CoopilotX listens to your live interview, understands each question in the context of your resume, and
            streams a{" "}
            <span className="text-blue-400 font-semibold">tailored answer in under 2 seconds</span> — invisibly, on your screen only.
          </motion.p>

          {/* Capability badges — honest features only */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {[
              { icon: "fa-microphone", label: "Speechmatics STT" },
              { icon: "fa-file-lines", label: "Resume-Aware Context" },
              { icon: "fa-bolt", label: "Groq LLaMA Streaming" },
              { icon: "fa-eye-slash", label: "Stealth Overlay" },
              { icon: "fa-shield-halved", label: "Zero Data Storage" },
            ].map((badge, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${
                  isDark ? "border-slate-700 bg-slate-900/60 text-slate-300" : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <i className={`fa-solid ${badge.icon} text-blue-400 text-[10px]`} />
                {badge.label}
              </span>
            ))}
          </motion.div>

          {/* ── Hero CTA Buttons — Brick Style ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {[
              { text: "Build My Resume", path: "resume", color: "purple", icon: "fa-file-lines" },
              { text: "Mock Interview", path: "mock-interview", color: "blue", icon: "fa-comment-dots" },
              { text: "Live Interview", path: "real-interview", color: "emerald", icon: "fa-bolt" },
            ].map((btn, i) => {
              const colorMap: Record<string, { bg: string; shadow: string; hover: string }> = {
                purple: { bg: "bg-purple-600 hover:bg-purple-500", shadow: "rgba(168,85,247,0.4)", hover: "0 6px 24px rgba(168,85,247,0.5)" },
                blue: { bg: "bg-blue-600 hover:bg-blue-500", shadow: "rgba(59,130,246,0.4)", hover: "0 6px 24px rgba(59,130,246,0.5)" },
                emerald: { bg: "bg-emerald-600 hover:bg-emerald-500", shadow: "rgba(16,185,129,0.4)", hover: "0 6px 24px rgba(16,185,129,0.5)" },
              };
              const c = colorMap[btn.color];
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  whileHover={{ scale: 1.04, y: -3, boxShadow: c.hover }}
                  whileTap={{ scale: 0.97, y: 1 }}
                  onClick={() => handleClick(btn.path)}
                  className={`inline-flex items-center gap-2.5 px-6 py-3 ${c.bg} text-white text-[14px] font-semibold rounded-lg transition-all duration-150 select-none`}
                  style={{ boxShadow: `0 2px 0 rgba(0,0,0,0.25), 0 4px 12px ${c.shadow}, inset 0 1px 0 rgba(255,255,255,0.15)` }}
                >
                  <i className={`fa-solid ${btn.icon} text-[13px] opacity-90`} />
                  {btn.text}
                </motion.button>
              );
            })}
          </motion.div>

          {/* ── DOWNLOAD SECTION ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className={`max-w-4xl mx-auto p-8 bg-gradient-to-br ${theme.card} border-2 ${theme.border} rounded-2xl backdrop-blur-xl shadow-2xl mt-12`}
          >
            <div className="text-center mb-8">
              <h3 className={`text-2xl font-bold mb-2 ${theme.text}`}>Download Desktop App</h3>
              <p className={`text-sm ${theme.textSecondary}`}>
                The stealth overlay requires the desktop app — it hides from screen-share on Zoom, Teams &amp; Meet.
              </p>
            </div>

            <div className="flex flex-col md:flex-row justify-center items-center gap-6">
              <motion.button
                whileHover={{ scale: 1.04, y: -3, boxShadow: "0 8px 28px rgba(59,130,246,0.55)" }}
                whileTap={{ scale: 0.97, y: 1 }}
                onClick={() => handleDownload("windows")}
                className="flex items-center gap-4 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg w-full md:w-auto min-w-[250px] justify-center transition-all duration-150 select-none"
                style={{ boxShadow: "0 2px 0 rgba(0,0,0,0.3), 0 4px 16px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" }}
              >
                <i className="fa-brands fa-windows text-3xl" />
                <div className="text-left">
                  <div className="text-xs opacity-80 font-medium">Get for</div>
                  <div className="text-lg font-bold">Windows</div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, y: -3, boxShadow: isDark ? "0 8px 28px rgba(148,163,184,0.3)" : "0 8px 28px rgba(30,41,59,0.35)" }}
                whileTap={{ scale: 0.97, y: 1 }}
                onClick={() => handleDownload("mac")}
                className={`flex items-center gap-4 px-8 py-4 ${isDark ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-800 hover:bg-slate-700"} text-white rounded-lg w-full md:w-auto min-w-[250px] justify-center transition-all duration-150 select-none`}
                style={{ boxShadow: "0 2px 0 rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)" }}
              >
                <i className="fa-brands fa-apple text-3xl" />
                <div className="text-left">
                  <div className="text-xs opacity-80 font-medium">Download for</div>
                  <div className="text-lg font-bold">macOS</div>
                </div>
              </motion.button>
            </div>

            <div className={`mt-6 pt-6 border-t ${theme.border} flex flex-wrap gap-4 justify-center text-xs ${theme.textSecondary}`}>
              <div className="flex items-center gap-2"><i className="fa-solid fa-check text-green-500" /> Professional MSIX Installer</div>
              <div className="flex items-center gap-2"><i className="fa-solid fa-check text-green-500" /> Works on Zoom, Teams &amp; Google Meet</div>
              <div className="flex items-center gap-2"><i className="fa-solid fa-shield-halved text-blue-500" /> Audio never leaves your device</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PERFORMANCE ANALYTICS ── */}
      <section className={`relative py-32 px-6 w-full border-t ${theme.border}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className={`text-5xl font-bold mb-4 ${theme.text}`}>Real-Time Performance Analytics</h2>
            <p className={`text-lg ${theme.textSecondary}`}>Data-driven insights that prove results</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.03 }}
              className={`p-8 bg-gradient-to-br ${theme.card} border ${theme.border} rounded-2xl backdrop-blur-xl`}
            >
              <h3 className={`text-xl font-bold mb-6 ${theme.text}`}>Interview Success Rate</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                  <XAxis dataKey="month" stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1e293b" : "#ffffff",
                      border: `1px solid ${isDark ? "#475569" : "#e2e8f0"}`,
                      borderRadius: "8px",
                      color: isDark ? "#f1f5f9" : "#0f172a",
                    }}
                  />
                  <Area type="monotone" dataKey="success" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSuccess)" />
                  <Area type="monotone" dataKey="confidence" stroke="#a78bfa" fillOpacity={1} fill="url(#colorConfidence)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className={`text-sm ${theme.textSecondary}`}>Success Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span className={`text-sm ${theme.textSecondary}`}>Confidence Level</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.03 }}
              className={`p-8 bg-gradient-to-br ${theme.card} border ${theme.border} rounded-2xl backdrop-blur-xl`}
            >
              <h3 className={`text-xl font-bold mb-6 ${theme.text}`}>AI Response Speed</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={aiMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                  <XAxis dataKey="time" stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} unit=" t/s" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1e293b" : "#ffffff",
                      border: `1px solid ${isDark ? "#475569" : "#e2e8f0"}`,
                      borderRadius: "8px",
                      color: isDark ? "#f1f5f9" : "#0f172a",
                    }}
                    formatter={(v: number) => [`${v} tokens/s`, "Throughput"]}
                  />
                  <Line type="monotone" dataKey="tokens" stroke="#10b981" strokeWidth={3} dot={{ fill: "#10b981", strokeWidth: 2, r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className={`text-sm ${theme.textSecondary} mt-4`}>
                Groq's LPU peaks at ~250 tokens/sec — full answer streams in under 2 seconds
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { value: "50K+", label: "Interviews Conducted", icon: "🎯", color: "from-blue-500 to-cyan-500" },
              { value: "98%", label: "Success Rate", icon: "⚡", color: "from-purple-500 to-pink-500" },
              { value: "<2s", label: "Response Time", icon: "🚀", color: "from-emerald-500 to-teal-500" },
              { value: "24/7", label: "AI Availability", icon: "🌐", color: "from-orange-500 to-red-500" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10, scale: 1.05 }}
                className={`p-6 bg-gradient-to-br ${theme.card} border ${theme.border} rounded-xl backdrop-blur-xl text-center`}
              >
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-1`}>
                  {stat.value}
                </div>
                <div className={`text-sm ${theme.textSecondary}`}>{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* ── HOW IT WORKS ── */}
      <section className="relative py-32 px-6 w-full">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className={`text-5xl font-bold mb-4 ${theme.text}`}>How It Works</h2>
            <p className={`text-lg ${theme.textSecondary}`}>Three real steps — no magic, just good engineering</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                num: "01",
                title: "Upload Your Resume",
                desc: "Paste or upload your resume. CoopilotX indexes your actual experience, skills, and projects so every answer it generates is specific to you — not generic filler.",
                color: "from-blue-500 to-cyan-500",
                icon: "📄",
              },
              {
                num: "02",
                title: "App Captures Audio",
                desc: "The desktop app listens via your microphone or system audio (capturing the interviewer's voice too). Speechmatics transcribes speech in real time with high accuracy across accents and noise.",
                color: "from-purple-500 to-pink-500",
                icon: "🎧",
              },
              {
                num: "03",
                title: "Groq LLaMA Streams an Answer",
                desc: "Press Space — LLaMA (via Groq's ultra-fast inference) generates a context-aware answer tailored to your resume and the question. Text streams to a hidden overlay only you can see.",
                color: "from-emerald-500 to-teal-500",
                icon: "⚡",
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                whileHover={{ scale: 1.05 }}
                className={`p-8 bg-gradient-to-br ${theme.card} border ${theme.border} rounded-2xl backdrop-blur-xl`}
              >
                <div className="text-6xl mb-4">{step.icon}</div>
                <div className={`text-7xl font-black bg-gradient-to-br ${step.color} bg-clip-text text-transparent opacity-20 mb-4`}>
                  {step.num}
                </div>
                <h3 className={`text-2xl font-bold mb-4 ${theme.text}`}>{step.title}</h3>
                <p className={`${theme.textSecondary} leading-relaxed`}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section
        className={`relative py-32 px-6 w-full ${isDark ? "bg-gradient-to-b from-slate-950 to-slate-900" : "bg-gradient-to-b from-white to-slate-50"} border-y ${theme.border}`}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className={`text-5xl font-bold mb-4 ${theme.text}`}>Tech Stack</h2>
            <p className={`text-lg ${theme.textSecondary}`}>What's actually powering CoopilotX</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { tech: "Next.js 14", desc: "App Router + TypeScript frontend", icon: "▲", color: "from-slate-400 to-slate-200" },
              { tech: "Speechmatics", desc: "Real-time speech-to-text transcription", icon: "🎤", color: "from-purple-500 to-pink-500" },
              { tech: "Groq + LLaMA", desc: "Ultra-fast Meta LLaMA inference", icon: "🧠", color: "from-emerald-500 to-teal-500" },
              { tech: "Firebase Auth", desc: "Google sign-in & session management", icon: "🔥", color: "from-orange-500 to-red-500" },
            ].map((tech, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -15, scale: 1.08 }}
                className={`p-6 bg-gradient-to-br ${theme.card} border ${theme.border} rounded-xl backdrop-blur-xl text-center`}
              >
                <div className="text-5xl mb-4">{tech.icon}</div>
                <h3 className={`text-xl font-bold bg-gradient-to-r ${tech.color} bg-clip-text text-transparent mb-2`}>{tech.tech}</h3>
                <p className={`text-sm ${theme.textSecondary}`}>{tech.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative py-32 px-6 w-full">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className={`text-5xl font-bold mb-4 ${theme.text}`}>Why CoopilotX</h2>
            <p className={`text-lg ${theme.textSecondary}`}>Built for real interview conditions</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Stealth Overlay",
                desc: "The answer panel is excluded from screen-share via Electron's transparent window flags — your interviewer sees nothing on their end.",
                icon: (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>),
                gradient: "from-slate-500 to-slate-700",
              },
              {
                title: "Resume-Grounded Answers",
                desc: "Every generated answer references your actual experience. No generic filler — if you haven't done it, it won't claim you did.",
                icon: (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>),
                gradient: "from-purple-500 to-pink-500",
              },
              {
                title: "Works on Any Platform",
                desc: "Captures system audio so it works with Zoom, Google Meet, Microsoft Teams, Webex — any platform that plays through your speakers.",
                icon: (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>),
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                title: "Mock Mode",
                desc: "Practice before the real thing. Mock Interview simulates questions based on your actual resume so you know what to expect.",
                icon: (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>),
                gradient: "from-green-500 to-emerald-500",
              },
              {
                title: "Private by Design",
                desc: "Audio is transcribed via Speechmatics and never stored on our servers. Only the text prompt is sent to Groq for inference. No recordings, no logs.",
                icon: (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>),
                gradient: "from-indigo-500 to-blue-500",
              },
              {
                title: "Open Source",
                desc: "Full codebase is public on GitHub. Inspect exactly what it does, fork it, self-host it, or contribute.",
                icon: (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>),
                gradient: "from-pink-500 to-rose-500",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10, scale: 1.05 }}
                className={`p-8 bg-gradient-to-br ${theme.card} border ${theme.border} rounded-xl backdrop-blur-xl`}
              >
                <div className={`inline-flex p-3 bg-gradient-to-br ${feature.gradient} rounded-lg mb-4 text-white shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className={`text-xl font-bold mb-3 ${theme.text}`}>{feature.title}</h3>
                <p className={`${theme.textSecondary} leading-relaxed text-sm`}>{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className={`relative py-32 px-6 w-full ${isDark ? "bg-gradient-to-b from-slate-900 to-slate-950" : "bg-gradient-to-b from-slate-50 to-white"} border-t ${theme.border}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className={`text-6xl font-black mb-6 leading-tight ${theme.text}`}>
            Your next interview,{" "}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              sorted.
            </span>
          </h2>

          <p className={`text-xl mb-12 leading-relaxed max-w-2xl mx-auto ${theme.textSecondary}`}>
            Upload your resume, download the app, and walk into your next interview with an AI copilot in your corner. Free to try — no credit card needed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.04, y: -3, boxShadow: "0 8px 28px rgba(99,102,241,0.55)" }}
              whileTap={{ scale: 0.97, y: 1 }}
              onClick={() => handleClick("mock-interview")}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-[15px] font-bold rounded-lg transition-all duration-150 select-none"
              style={{ boxShadow: "0 2px 0 rgba(0,0,0,0.25), 0 4px 16px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" }}
            >
              Try Mock Interview Free
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.97, y: 1 }}
              onClick={() => handleClick("resume")}
              className={`px-10 py-4 text-[15px] font-bold rounded-lg border-2 transition-all duration-150 select-none ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-600 text-white"
                  : "bg-white hover:bg-slate-50 border-slate-300 text-slate-900"
              }`}
              style={{
                boxShadow: isDark
                  ? "0 2px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)"
                  : "0 2px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              Build My Resume
            </motion.button>
          </div>

          <p className={`text-sm mt-6 ${theme.textSecondary}`}>
            No credit card required ·{" "}
            <a
              href="https://github.com/moto123a/AI-Powered-Developer-Assistance-Platform"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Open source on GitHub
            </a>
          </p>
        </motion.div>
      </section>

      <Footer isDark={isDark} />

      <motion.div
        className="fixed pointer-events-none rounded-full z-50 opacity-30"
        style={{ left: mouse.x - 200, top: mouse.y - 200, width: 400, height: 400 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
      </motion.div>
    </main>
  );
}
