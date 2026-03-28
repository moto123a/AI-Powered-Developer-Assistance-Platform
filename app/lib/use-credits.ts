// frontend/app/lib/useCredits.ts
// ═══════════════════════════════════════════════════════════════
// React hook for credit checking on frontend pages
// Usage: const { checkAndDeduct, credits, plan, showPaywall } = useCredits();
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { CREDIT_COSTS, PLAN_CONFIG, type CreditAction, type PlanId } from "./credits";

export function useCredits() {
  const [uid, setUid] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [plan, setPlan] = useState<PlanId>("free");
  const [loading, setLoading] = useState(true);

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallAction, setPaywallAction] = useState("");
  const [paywallCost, setPaywallCost] = useState(0);

  // Listen to auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
      if (!user) {
        setCredits(0);
        setPlan("free");
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Listen to Firestore user doc (real-time credits updates)
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCredits(data.credits || 0);
        setPlan((data.plan as PlanId) || "free");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  // Check if user can afford action — returns true/false
  // If false, opens paywall modal
  const canAfford = useCallback((action: CreditAction): boolean => {
    const cost = CREDIT_COSTS[action];
    const planConfig = PLAN_CONFIG[plan];

    // Pro = unlimited
    if (planConfig.totalCredits === -1) return true;

    if (credits < cost) {
      setPaywallAction(action.replace(/_/g, " "));
      setPaywallCost(cost);
      setShowPaywall(true);
      return false;
    }
    return true;
  }, [credits, plan]);

  // Server-side deduction — call your API route which deducts in Firestore
  const deductOnServer = useCallback(async (action: CreditAction): Promise<boolean> => {
    if (!uid) return false;
    try {
      const res = await fetch("/api/credits/deduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, action }),
      });
      const data = await res.json();
      return data.success || false;
    } catch {
      return false;
    }
  }, [uid]);

  // Combined: check + deduct (use this before AI calls)
  const checkAndDeduct = useCallback(async (action: CreditAction): Promise<boolean> => {
    if (!canAfford(action)) return false;
    return await deductOnServer(action);
  }, [canAfford, deductOnServer]);

  return {
    uid,
    credits,
    plan,
    loading,
    canAfford,
    checkAndDeduct,
    showPaywall,
    setShowPaywall,
    paywallAction,
    paywallCost,
    isUnlimited: PLAN_CONFIG[plan].totalCredits === -1,
  };
}