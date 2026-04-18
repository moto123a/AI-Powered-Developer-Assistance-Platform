// app/real-interview/dashboard/page.tsx
// Single responsibility: session history dashboard only

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2,
  BarChart2, Calendar,
  MessageSquare, Trophy,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import AuthModal from "../../../components/AuthModal";
import { useSession } from "../_hooks/useSession";
import SessionCard from "../_components/SessionCard";

export default function DashboardPage() {
  const router                  = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [authLoading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  const userEmail = user?.email || "";

  const {
    sessions, loading,
    loadSessions,
    formatDate, formatDuration,
  } = useSession(userEmail);

  // ── Auth check ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
      if (!u) setShowAuth(true);
    });
    return unsub;
  }, []);

  // ── Load sessions once user is known ──
  useEffect(() => {
    if (userEmail) loadSessions();
  }, [userEmail, loadSessions]);

  // ── Stats ──
  const totalQuestions = sessions.reduce((s, sess) => s + (sess.questionCount || 0), 0);
  const totalMins      = Math.round(
    sessions.reduce((s, sess) => s + (sess.durationSecs || 0), 0) / 60
  );
  const companies      = [...new Set(
    sessions.map(s => s.companyName).filter(c => c && c !== "Unknown")
  )].length;

  if (authLoading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 antialiased font-sans">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <div className="max-w-3xl mx-auto px-5 py-10 pb-24">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/real-interview")}
              className="text-slate-600 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-blue-500 font-mono text-[10px] tracking-widest font-bold uppercase mb-1">
                Interview Copilot
              </p>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Session History
              </h1>
            </div>
          </div>

          <button
            onClick={() => router.push("/real-interview")}
            className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-500 transition-all"
          >
            + New Session
          </button>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: MessageSquare, label: "Total Sessions",  value: sessions.length },
            { icon: Trophy,        label: "Questions Asked", value: totalQuestions   },
            { icon: Calendar,      label: "Minutes Practiced", value: totalMins      },
          ].map(({ icon: Icon, label, value }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.02] border border-white/8 rounded-2xl p-5 text-center"
            >
              <Icon size={18} className="text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-black text-white font-mono">{value}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-1 font-bold">
                {label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Session list ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>

        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <BarChart2 size={40} className="text-slate-700" />
            <p className="text-slate-500 font-bold text-lg">No sessions yet</p>
            <p className="text-slate-700 text-sm">
              Start your first interview session to see history here.
            </p>
            <button
              onClick={() => router.push("/real-interview")}
              className="mt-2 px-6 py-3 bg-blue-600 rounded-xl font-bold text-white hover:bg-blue-500 transition-all"
            >
              Start First Session
            </button>
          </div>

        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.06 } },
            }}
            className="space-y-3"
          >
            {sessions.map(session => (
              <motion.div
                key={session.id}
                variants={{
                  hidden:   { opacity: 0, y: 10 },
                  visible:  { opacity: 1, y: 0  },
                }}
              >
                <SessionCard
                  session={session}
                  formatDate={formatDate}
                  formatDuration={formatDuration}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

      </div>
    </div>
  );
}