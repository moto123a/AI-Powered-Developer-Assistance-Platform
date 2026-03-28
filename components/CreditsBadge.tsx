// frontend/components/CreditsBadge.tsx
// Shows "⚡ 85 credits" in the header — real-time from Firestore
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../app/firebaseConfig";
import { useRouter } from "next/navigation";
import { Zap, Crown } from "lucide-react";

export default function CreditsBadge() {
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState("free");
  const [uid, setUid] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCredits(data.credits ?? 0);
        setPlan(data.plan || "free");
      }
    });
    return () => unsub();
  }, [uid]);

  if (!uid || credits === null) return null;

  const isUnlimited = plan === "pro";
  const isLow = !isUnlimited && credits < 20;

  return (
    <button
      onClick={() => router.push("/pricing")}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
        isUnlimited
          ? "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
          : isLow
          ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 animate-pulse"
          : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
      }`}
      title={isUnlimited ? "Pro plan — unlimited" : `${credits} credits remaining. Click to upgrade.`}
    >
      {isUnlimited ? (
        <>
          <Crown size={12} />
          <span>Pro</span>
        </>
      ) : (
        <>
          <Zap size={12} />
          <span>{credits}</span>
        </>
      )}
    </button>
  );
}