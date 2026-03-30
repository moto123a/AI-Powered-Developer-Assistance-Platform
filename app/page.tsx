"use client";
<<<<<<< HEAD

import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
=======
import CreditsBadge from "../components/CreditsBadge";
import { motion, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";
>>>>>>> 8f1600a66dbe270767f051802c369779e3e1bb2f
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import CreditsBadge from "../components/CreditsBadge";
import Footer from "../components/Footer";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Environment } from "@react-three/drei";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
// HERO SPHERE — reads scroll to rotate, idle spin otherwise
// ═══════════════════════════════════════════════════════════════

/**
 * scrollRef holds a 0→1 value updated on every scroll event.
 * useFrame reads it each tick — zero React re-renders, zero jank.
 *
 * Scroll mapping:
 *   rotationY = scrollProgress * 6π  →  3 full Y-axis turns top→bottom
 *   rotationX = scrollProgress * 4π  →  2 full X-axis turns top→bottom
 */
function HeroSphere({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const wireRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t  = clock.getElapsedTime();
    const sp = scrollRef.current; // 0.0 → 1.0

    if (meshRef.current) {
      // Scroll-driven rotation + a tiny idle spin so it never looks frozen
      meshRef.current.rotation.y = sp * Math.PI * 6 + t * 0.06;
      meshRef.current.rotation.x = sp * Math.PI * 4 + Math.sin(t * 0.15) * 0.12;
    }
    if (wireRef.current) {
      // Counter-rotate wireframe for depth
      wireRef.current.rotation.y = -(sp * Math.PI * 3) - t * 0.04;
      wireRef.current.rotation.z = Math.cos(t * 0.1) * 0.1;
    }
  });

  return (
    // No <Float> wrapper — Float adds autonomous movement which fights scroll rotation
    <group>
      <mesh ref={meshRef} scale={2.4}>
        <icosahedronGeometry args={[1, 48]} />
        <MeshDistortMaterial
          color="#4338ca"
          roughness={0.12}
          metalness={0.95}
          distort={0.25}
          speed={1.2}
          envMapIntensity={1.8}
        />
      </mesh>

      <mesh ref={wireRef} scale={2.8}>
        <icosahedronGeometry args={[1, 16]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.06} wireframe />
      </mesh>

      <mesh scale={2.0}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.04} />
      </mesh>
    </group>
  );
}

function OrbitalRings({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const g1 = useRef<THREE.Mesh>(null!);
  const g2 = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t  = clock.getElapsedTime();
    const sp = scrollRef.current;

    if (g1.current) {
      g1.current.rotation.z = t * 0.12 + sp * Math.PI * 2;
      g1.current.rotation.x = Math.PI / 2.2;
    }
    if (g2.current) {
      g2.current.rotation.z = -t * 0.08 - sp * Math.PI * 1.5;
      g2.current.rotation.x = Math.PI / 2.8;
    }
  });

  return (
    <>
      <mesh ref={g1}>
        <torusGeometry args={[3.6, 0.006, 16, 100]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.12} />
      </mesh>
      <mesh ref={g2}>
        <torusGeometry args={[4.2, 0.005, 16, 100]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.07} />
      </mesh>
    </>
  );
}

function Particles() {
  const ref = useRef<THREE.Points>(null!);
  const count = 80;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#818cf8" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function HeroScene({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 5, 5]} intensity={1} color="#c7d2fe" />
      <pointLight position={[-4, -3, -4]} intensity={0.4} color="#7c3aed" />
      <pointLight position={[3, -2, 4]}   intensity={0.3} color="#06b6d4" />
      <HeroSphere    scrollRef={scrollRef} />
      <OrbitalRings  scrollRef={scrollRef} />
      <Particles />
      <Environment preset="night" />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION WRAPPER
// ═══════════════════════════════════════════════════════════════
function Section({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

const WINDOWS_DOWNLOAD = "/app.msixbundle";
const MAC_DOWNLOAD     = "/InterviewCopilotMac-1.0.0.pkg";

export default function Home() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [mounted, setMounted]   = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  /**
   * scrollProgressRef: updated every scroll event via passive listener.
   * Plain ref = no React re-renders on scroll = silky smooth rotation.
   */
  const scrollProgressRef = useRef<number>(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop  = window.scrollY;
      const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgressRef.current = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    if (!document.querySelector('link[href*="Sora"]')) {
      const l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const go = (path: string) => {
    if (!user && path !== "pricing" && path !== "resume") {
      router.push(`/login?redirect=/${path}`);
      return;
    }
    router.push(`/${path}`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = "coopilotx_session=; path=/; max-age=0";
    setUser(null); setShowMenu(false); router.push("/login");
  };

  const download = (os: "win" | "mac") => {
    const a = document.createElement("a");
    a.href     = os === "win" ? WINDOWS_DOWNLOAD : MAC_DOWNLOAD;
    a.download = os === "win" ? "app.msixbundle" : "InterviewCopilotMac-1.0.0.pkg";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);

  return (
    <main
      className="relative bg-[#06060f] text-white"
      style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
    >

      {/* ════════════════════════════════════════════════════════
          BIG BACKGROUND SPHERE — FIXED BEHIND EVERYTHING
          • position: fixed  → stays on screen while page scrolls
          • z-index: 0        → behind all page content
          • pointer-events: none → never blocks any clicks
          • The Canvas itself is transparent so the dark bg shows through
          • Sphere rotation is driven by scrollProgressRef each frame
      ════════════════════════════════════════════════════════ */}
      {mounted && (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          aria-hidden="true"
        >
          <Canvas
            camera={{ position: [0, 0, 7], fov: 42 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true }}
            style={{ background: "transparent" }}
          >
            <Suspense fallback={null}>
              <HeroScene scrollRef={scrollProgressRef} />
            </Suspense>
          </Canvas>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          AMBIENT BACKGROUND GLOWS — also fixed, behind content
      ════════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/[0.07] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-600/[0.05] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.8) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* ════════════════════════════════════════════════════════
          ALL PAGE CONTENT — scrolls normally over the fixed sphere
          z-index: 10 puts it above the sphere (z-0) and glows (z-1)
      ════════════════════════════════════════════════════════ */}
      <div className="relative z-10">

<<<<<<< HEAD
        {/* ═══ HEADER ═══ */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#06060f]/80 backdrop-blur-2xl border-b border-white/[0.04]">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
            <div className="flex items-center gap-2.5 mr-8 cursor-pointer" onClick={() => router.push("/")}>
              <img src="/logo.jpeg" alt="CoopilotX" className="w-7 h-7 rounded-md" />
              <span className="text-[15px] font-bold tracking-tight">
                CoopilotX <span className="text-indigo-400">AI</span>
=======
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
>>>>>>> 8f1600a66dbe270767f051802c369779e3e1bb2f
              </span>
            </div>

            <div className="hidden md:block w-px h-4 bg-white/[0.08] mr-5" />

            <nav className="hidden md:flex items-center gap-0.5 flex-1">
              {[
                { label: "Resume",         path: "resume" },
                { label: "Mock Interview", path: "mock-interview" },
                { label: "Real-Time",      path: "real-interview" },
                { label: "Pricing",        path: "pricing" },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-white/40 hover:text-white/80 rounded-md hover:bg-white/[0.04] transition-all"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 ml-auto">
              <CreditsBadge />
              {!user ? (
                <>
                  <button
                    onClick={() => router.push("/login?mode=signin")}
                    className="px-4 py-1.5 text-[13px] font-medium text-white/50 hover:text-white/80 transition-colors"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => router.push("/login?mode=signup")}
                    className="px-4 py-1.5 text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Get started
                  </button>
                </>
              ) : (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setShowMenu(!showMenu)} className="focus:outline-none">
                    <img
                      src={user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                      alt="Profile"
                      className="w-8 h-8 rounded-full border-2 border-indigo-500/40 hover:border-indigo-500 transition-colors"
                    />
                  </button>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-0 mt-2 w-56 bg-[#0f0f1a] border border-white/[0.06] rounded-xl shadow-2xl overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/[0.06]">
                        <p className="text-sm font-medium truncate">{user.displayName || user.email}</p>
                        <p className="text-xs text-white/30 mt-0.5 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-all"
                      >
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ═══ HERO ═══ */}
        {/* min-h-screen gives the first viewport that "sphere as background" look */}
        <section className="relative min-h-screen flex items-center pt-16">
          <motion.div style={{ y: heroY }} className="max-w-7xl mx-auto px-6 w-full">
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 bg-indigo-500/[0.08] border border-indigo-500/[0.15] rounded-full"
              >
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-indigo-300/80">AI-Powered Interview Copilot</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.8 }}
                className="text-5xl md:text-7xl lg:text-[80px] font-extrabold tracking-tight leading-[0.95] mb-6"
              >
                <span className="text-white/95">Ace every</span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  interview.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.8 }}
                className="text-lg md:text-xl text-white/30 leading-relaxed mb-10 max-w-xl"
              >
                Real-time AI copilot that listens to your interview, understands your resume, and streams a{" "}
                <span className="text-indigo-400/80 font-medium">tailored answer in under 2 seconds</span> — invisibly
                on your screen.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7 }}
                className="flex flex-wrap gap-3"
              >
                <button
                  onClick={() => go("mock-interview")}
                  className="px-7 py-3 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/35"
                >
                  Try Mock Interview
                </button>
                <button
                  onClick={() => go("resume")}
                  className="px-7 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm font-medium rounded-xl transition-all text-white/60 hover:text-white/90"
                >
                  Build My Resume
                </button>
                <button
                  onClick={() => go("real-interview")}
                  className="px-7 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm font-medium rounded-xl transition-all text-white/60 hover:text-white/90"
                >
                  Live Interview
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex flex-wrap gap-4 mt-10"
              >
                {["Speechmatics STT", "Groq LLaMA", "Resume-Aware", "Stealth Mode", "Zero Storage"].map((b, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-[11px] font-medium text-white/25 border border-white/[0.06] rounded-full bg-white/[0.02]"
                  >
                    {b}
                  </span>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* ═══ STATS ═══ */}
        <Section className="py-20 px-6 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { val: "<2s",  label: "Response time" },
                { val: "98%",  label: "Accuracy" },
                { val: "50K+", label: "Interviews" },
                { val: "24/7", label: "Available" },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center py-6"
                >
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                    {s.val}
                  </div>
                  <div className="text-xs text-white/25 mt-1 font-medium uppercase tracking-wider">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══ HOW IT WORKS ═══ */}
        <Section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">How it works</h2>
              <p className="text-white/25 text-sm max-w-lg mx-auto">Three steps. No magic — just good engineering.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { num: "01", title: "Upload resume",  desc: "Paste your resume. AI indexes your experience so every answer references your real background.", icon: "📄" },
                { num: "02", title: "Start interview", desc: "Speechmatics transcribes speech in real-time. Works with any video call platform.", icon: "🎤" },
                { num: "03", title: "Get AI answers",  desc: "Groq LLaMA generates resume-grounded answers in under 2 seconds. Streamed to a stealth overlay.", icon: "⚡" },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-7 hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="text-3xl mb-4">{step.icon}</div>
                  <div className="text-[10px] text-indigo-400/50 font-bold uppercase tracking-widest mb-2">{step.num}</div>
                  <h3 className="text-lg font-semibold mb-2 text-white/85 group-hover:text-white transition-colors">{step.title}</h3>
                  <p className="text-sm text-white/25 leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══ FEATURES ═══ */}
        <Section className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Built for real interviews</h2>
              <p className="text-white/25 text-sm max-w-lg mx-auto">Every feature exists because real users needed it.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { title: "Stealth overlay",   desc: "Hidden from screen-share. Interviewer sees nothing.",               color: "indigo"  },
                { title: "Resume-grounded",   desc: "Every answer uses your real experience. No generic filler.",         color: "violet"  },
                { title: "Any platform",      desc: "Works with Zoom, Meet, Teams, Webex — anything with audio.",         color: "cyan"    },
                { title: "Mock mode",         desc: "Practice with AI-generated questions before the real thing.",        color: "emerald" },
                { title: "Private by design", desc: "Audio never stored. Only text prompt sent to AI. No logs.",          color: "amber"   },
                { title: "Desktop app",       desc: "Native Windows + Mac app for stealth mode and system audio.",        color: "rose"    },
              ].map((f, i) => {
                const colors: Record<string, string> = {
                  indigo:  "border-indigo-500/20 hover:border-indigo-500/40",
                  violet:  "border-violet-500/20 hover:border-violet-500/40",
                  cyan:    "border-cyan-500/20   hover:border-cyan-500/40",
                  emerald: "border-emerald-500/20 hover:border-emerald-500/40",
                  amber:   "border-amber-500/20  hover:border-amber-500/40",
                  rose:    "border-rose-500/20   hover:border-rose-500/40",
                };
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className={`bg-white/[0.02] border ${colors[f.color]} rounded-2xl p-6 transition-all hover:bg-white/[0.04]`}
                  >
                    <h3 className="text-[15px] font-semibold mb-1.5 text-white/80">{f.title}</h3>
                    <p className="text-sm text-white/25 leading-relaxed">{f.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ═══ TECH STACK ═══ */}
        <Section className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Tech stack</h2>
              <p className="text-white/25 text-sm">What powers CoopilotX under the hood.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Next.js 14",   desc: "React framework",   icon: "▲" },
                { name: "Speechmatics", desc: "Real-time STT",     icon: "🎤" },
                { name: "Groq + LLaMA", desc: "Fast AI inference", icon: "🧠" },
                { name: "Firebase",     desc: "Auth + database",   icon: "🔥" },
              ].map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 text-center hover:bg-white/[0.04] transition-all"
                >
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <div className="text-sm font-semibold text-white/70">{t.name}</div>
                  <div className="text-[11px] text-white/20 mt-0.5">{t.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══ DOWNLOAD ═══ */}
        <Section className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-3xl p-10 text-center">
              <h3 className="text-2xl font-bold mb-2">Download desktop app</h3>
              <p className="text-sm text-white/25 mb-8">
                Stealth overlay requires the native app — hidden from Zoom, Teams &amp; Meet screen-share.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => download("win")}
                  className="flex items-center gap-3 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] text-white/60">Get for</div>
                    <div className="text-sm font-bold">Windows</div>
                  </div>
                </button>
                <button
                  onClick={() => download("mac")}
                  className="flex items-center gap-3 px-7 py-3.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl transition-all"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] text-white/40">Download for</div>
                    <div className="text-sm font-semibold text-white/70">macOS</div>
                  </div>
                </button>
              </div>
              <div className="flex flex-wrap gap-4 justify-center mt-6 text-[11px] text-white/15">
                <span>✓ MSIX installer</span>
                <span>✓ Works on all platforms</span>
                <span>✓ Audio stays on device</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ CTA ═══ */}
        <Section className="py-32 px-6 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-tight">
              Your next interview,{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                sorted.
              </span>
            </h2>
            <p className="text-white/25 text-base mb-10 max-w-xl mx-auto leading-relaxed">
              Upload your resume, download the app, and walk in with an AI copilot. Free to start — 100 credits, no credit card.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => go("mock-interview")}
                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/25"
              >
                Try Free — 100 Credits
              </button>
              <button
                onClick={() => go("pricing")}
                className="px-8 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm font-medium rounded-xl transition-all text-white/50"
              >
                View Pricing
              </button>
            </div>
          </div>
        </Section>

        {/* ═══ FOOTER ═══ */}
        <Footer />

      </div>{/* end z-10 content wrapper */}
    </main>
  );
}
