// components/AuthModal.tsx
// ONLY CHANGE: imports initializeUserCredits and calls it on login/signup
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../app/firebaseConfig";
import { initializeUserCredits } from "../app/lib/credits";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Save user to Firestore WITH credits
  const saveUserToDb = async (user: any) => {
    try {
      await initializeUserCredits(
        user.uid,
        user.email || "",
        user.displayName || "User"
      );
    } catch (err) {
      console.error("Error saving user:", err);
    }
  };

  const handleAuth = async () => {
    setLoading(true);
    setError("");
    try {
      let result;
      if (isSignUp) {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      if (result.user) await saveUserToDb(result.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) await saveUserToDb(result.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-md px-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/50 backdrop-blur-xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div className="absolute inset-0 opacity-30"
            animate={{ background: ["radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)", "radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)", "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />

          <motion.button onClick={onClose} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700/70 border border-slate-600/50 transition-colors z-10">
            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </motion.button>

          <div className="relative z-10">
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-center mb-8">
              <motion.div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl" whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: "spring", stiffness: 300 }}>
                <img src="/logo.jpeg" alt="CoopilotX Logo" className="w-15 h-15 object-cover rounded-xl" />
              </motion.div>
              <h2 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {isSignUp ? "Create Account" : "Welcome Back"}
                </span>
              </h2>
              <p className="text-slate-400 text-sm">
                {isSignUp ? "Sign up — get 100 free AI credits" : "Sign in to continue your journey"}
              </p>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-4">
              <div className="relative group">
                <input type="email" placeholder="Email address"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={email} onChange={(e) => setEmail(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleAuth()} />
              </div>
              <div className="relative group">
                <input type="password" placeholder="Password"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleAuth()} />
              </div>

              <motion.button onClick={handleAuth} disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group">
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <span>{isSignUp ? "Create Account" : "Sign In"}</span>
                )}
              </motion.button>

              <div className="relative flex items-center justify-center my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
                <div className="relative bg-slate-900 px-4"><span className="text-slate-500 text-sm">or continue with</span></div>
              </div>

              <motion.button onClick={handleGoogleLogin} disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-gray-100 text-slate-900 font-semibold transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </motion.button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 text-center">
              <p className="text-slate-400 text-sm">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <motion.button onClick={() => { setIsSignUp(!isSignUp); setError(""); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                  {isSignUp ? "Sign In" : "Sign Up"}
                </motion.button>
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}