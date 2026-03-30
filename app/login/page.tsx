"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { initializeUserCredits } from "../lib/credits";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float, Environment } from "@react-three/drei";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
// 3D ANIMATED SPHERE — morphing, pulsing, reacts to auth state
// ═══════════════════════════════════════════════════════════════
function MorphSphere({ isLoading }: { isLoading: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<any>(null!);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    meshRef.current.rotation.y = t * 0.15;
    meshRef.current.rotation.z = Math.cos(t * 0.2) * 0.1;

    if (materialRef.current) {
      materialRef.current.distort = isLoading
        ? 0.6 + Math.sin(t * 8) * 0.2
        : 0.3 + Math.sin(t * 0.8) * 0.1;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.8}>
      <mesh ref={meshRef} scale={2.2}>
        <icosahedronGeometry args={[1, 64]} />
        <MeshDistortMaterial
          ref={materialRef}
          color="#4f46e5"
          roughness={0.15}
          metalness={0.9}
          distort={0.3}
          speed={1.5}
          envMapIntensity={1.5}
        />
      </mesh>
      {/* Inner glow sphere */}
      <mesh scale={1.8}>
        <icosahedronGeometry args={[1, 32]} />
        <meshBasicMaterial
          color="#818cf8"
          transparent
          opacity={0.08}
          wireframe
        />
      </mesh>
    </Float>
  );
}

function OrbitalRing({ radius, speed, color, opacity }: { radius: number; speed: number; color: string; opacity: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = clock.getElapsedTime() * speed;
    ref.current.rotation.x = Math.PI / 2 + Math.sin(clock.getElapsedTime() * 0.3) * 0.3;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.008, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function Scene({ isLoading }: { isLoading: boolean }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#c7d2fe" />
      <pointLight position={[-5, -3, -5]} intensity={0.5} color="#7c3aed" />
      <pointLight position={[3, -2, 4]} intensity={0.4} color="#06b6d4" />
      <MorphSphere isLoading={isLoading} />
      <OrbitalRing radius={3.2} speed={0.2} color="#6366f1" opacity={0.15} />
      <OrbitalRing radius={3.8} speed={-0.15} color="#8b5cf6" opacity={0.1} />
      <OrbitalRing radius={4.4} speed={0.1} color="#a78bfa" opacity={0.06} />
      <Environment preset="night" />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════
type Mode = "signin" | "signup" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/");
      else setCheckingAuth(false);
    });
    return () => unsub();
  }, [router]);

  // Load fonts
  useEffect(() => {
    if (!document.querySelector('link[href*="Sora"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const clearMsg = () => { setError(""); setSuccess(""); };

  const friendlyError = (code: string) => {
    const m: Record<string, string> = {
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/too-many-requests": "Too many attempts. Please wait.",
      "auth/invalid-credential": "Invalid email or password.",
      "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    };
    return m[code] ?? "Something went wrong. Please try again.";
  };

  const saveUser = async (user: any) => {
    try {
      await initializeUserCredits(user.uid, user.email || "", user.displayName || name || "User");
    } catch {}
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMsg();
    setLoading(true);
    try {
      let result;
      if (mode === "signup") {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      if (result.user) await saveUser(result.user);
      router.replace("/");
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    clearMsg();
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) await saveUser(result.user);
      router.replace("/");
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMsg();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Reset link sent! Check your inbox.");
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#06060f] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06060f] flex flex-col lg:flex-row overflow-hidden" style={{ fontFamily: "'Sora', sans-serif" }}>

      {/* ═══ LEFT — 3D Canvas ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="hidden lg:flex lg:w-[55%] relative items-center justify-center overflow-hidden"
      >
        {/* Deep background */}
        <div className="absolute inset-0 bg-[#06060f]" />

        {/* Gradient mist */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px]" />
        </div>

        {/* Three.js Canvas */}
        {mounted && (
          <div className="absolute inset-0 z-10">
            <Canvas camera={{ position: [0, 0, 7], fov: 45 }} dpr={[1, 2]}>
              <Suspense fallback={null}>
                <Scene isLoading={loading} />
              </Suspense>
            </Canvas>
          </div>
        )}

        {/* Overlay content */}
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-12 pointer-events-none">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 pointer-events-auto"
          >
            <div className="w-9 h-9">
              <img src="/logo.jpeg" alt="CoopilotX" className="w-full h-full rounded-lg object-contain" />
            </div>
            <span className="text-white/90 text-lg font-bold tracking-tight">
              CoopilotX <span className="text-indigo-400">AI</span>
            </span>
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="max-w-md"
          >
            <h2 className="text-4xl font-bold text-white/95 leading-[1.15] mb-4 tracking-tight">
              Your AI interview
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                copilot awaits.
              </span>
            </h2>
            <p className="text-white/40 text-sm leading-relaxed max-w-sm">
              Real-time transcription, resume-grounded answers, and stealth overlay — all powered by AI that understands your experience.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex gap-10"
          >
            {[
              { val: "<2s", label: "Response" },
              { val: "98%", label: "Success" },
              { val: "100", label: "Free credits" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  {s.val}
                </div>
                <div className="text-white/30 text-[11px] mt-0.5 tracking-wide uppercase">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* ═══ RIGHT — Auth Form ═══ */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative"
      >
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.8) 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }} />

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8">
            <img src="/logo.jpeg" alt="CoopilotX" className="w-full h-full rounded-md object-contain" />
          </div>
          <span className="text-white text-base font-bold">
            CoopilotX <span className="text-indigo-400">AI</span>
          </span>
        </div>

        <div className="w-full max-w-[380px] relative z-10">

          {/* Glassmorphism card */}
          <motion.div
            layout
            className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 shadow-2xl shadow-black/40"
          >
            {/* Heading */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mb-7"
              >
                <h1 className="text-[22px] font-bold text-white mb-1.5 tracking-tight">
                  {mode === "signin" && "Welcome back"}
                  {mode === "signup" && "Create account"}
                  {mode === "reset" && "Reset password"}
                </h1>
                <p className="text-white/35 text-[13px]">
                  {mode === "signin" && "Sign in to continue to CoopilotX"}
                  {mode === "signup" && "Start with 100 free AI credits"}
                  {mode === "reset" && "We'll send a reset link to your email"}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Google button */}
            {mode !== "reset" && (
              <>
                <motion.button
                  whileHover={{ scale: 1.015, backgroundColor: "rgba(255,255,255,0.06)" }}
                  whileTap={{ scale: 0.985 }}
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/80 text-[13px] font-medium transition-all disabled:opacity-40"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </motion.button>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-white/20 text-[11px] uppercase tracking-widest font-medium">or</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
              </>
            )}

            {/* Form */}
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onSubmit={mode === "reset" ? handleReset : handleEmailAuth}
                className="flex flex-col gap-4"
              >
                {mode === "signup" && (
                  <div>
                    <label className="text-[11px] text-white/30 font-medium mb-1.5 block uppercase tracking-wider">Full name</label>
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/50 focus:bg-white/[0.06] text-white text-[13px] rounded-xl px-4 py-3 outline-none transition-all placeholder:text-white/15"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] text-white/30 font-medium mb-1.5 block uppercase tracking-wider">Email</label>
                  <input
                    type="email" value={email} onChange={e => { setEmail(e.target.value); clearMsg(); }}
                    placeholder="you@example.com" required
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/50 focus:bg-white/[0.06] text-white text-[13px] rounded-xl px-4 py-3 outline-none transition-all placeholder:text-white/15"
                  />
                </div>

                {mode !== "reset" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Password</label>
                      {mode === "signin" && (
                        <button type="button" onClick={() => { setMode("reset"); clearMsg(); }}
                          className="text-[11px] text-indigo-400/70 hover:text-indigo-400 transition-colors">
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"} value={password}
                        onChange={e => { setPassword(e.target.value); clearMsg(); }}
                        placeholder={mode === "signup" ? "Min 6 characters" : "Your password"} required
                        className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/50 focus:bg-white/[0.06] text-white text-[13px] rounded-xl px-4 py-3 pr-10 outline-none transition-all placeholder:text-white/15"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                        {showPass ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error / Success */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-red-500/10 border border-red-500/15 rounded-xl">
                      <p className="text-red-400/80 text-[12px]">{error}</p>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-xl">
                      <p className="text-emerald-400/80 text-[12px]">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.button
                  type="submit" disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.015 }}
                  whileTap={{ scale: loading ? 1 : 0.985 }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white text-[13px] font-semibold rounded-xl transition-all mt-1 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
                >
                  {loading ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      {mode === "signup" ? "Creating..." : mode === "reset" ? "Sending..." : "Signing in..."}
                    </>
                  ) : (
                    <>
                      {mode === "signup" && "Create account"}
                      {mode === "signin" && "Sign in"}
                      {mode === "reset" && "Send reset link"}
                    </>
                  )}
                </motion.button>
              </motion.form>
            </AnimatePresence>

            {/* Mode switch */}
            <div className="mt-6 text-center">
              {mode === "signin" && (
                <p className="text-white/25 text-[13px]">
                  No account?{" "}
                  <button onClick={() => { setMode("signup"); clearMsg(); setPassword(""); }}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    Sign up free
                  </button>
                </p>
              )}
              {mode === "signup" && (
                <p className="text-white/25 text-[13px]">
                  Have an account?{" "}
                  <button onClick={() => { setMode("signin"); clearMsg(); setPassword(""); }}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    Sign in
                  </button>
                </p>
              )}
              {mode === "reset" && (
                <button onClick={() => { setMode("signin"); clearMsg(); }}
                  className="text-white/25 hover:text-white/50 text-[13px] transition-colors flex items-center gap-1.5 mx-auto">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to sign in
                </button>
              )}
            </div>
          </motion.div>

          {/* Terms */}
          {mode === "signup" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/15 text-[11px] text-center mt-5 leading-relaxed"
            >
              By signing up you agree to our{" "}
              <a href="/terms" className="text-white/25 hover:text-white/50 transition-colors underline underline-offset-2">Terms</a>
              {" "}&{" "}
              <a href="/privacy" className="text-white/25 hover:text-white/50 transition-colors underline underline-offset-2">Privacy</a>.
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
}