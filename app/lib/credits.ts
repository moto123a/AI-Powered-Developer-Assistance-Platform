// frontend/app/lib/credits.ts
// ═══════════════════════════════════════════════════════════════
// CREDIT SYSTEM — Single source of truth for all usage tracking
// Reads/writes Firestore. Used by API routes + frontend pages.
// ═══════════════════════════════════════════════════════════════

import { doc, getDoc, updateDoc, setDoc, increment } from "firebase/firestore";
import { db } from "../firebaseConfig";

// ── CREDIT COSTS PER ACTION ──
export const CREDIT_COSTS = {
  resume_analysis: 10,
  resume_tailor: 20,
  mock_interview_session: 15,
  mock_feedback: 5,
  mock_script: 5,
  realtime_per_minute: 2,
  question_generation: 5,
  verify_resume: 0, // free
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// ── PLAN LIMITS ──
export const PLAN_CONFIG = {
  free: {
    label: "Free",
    totalCredits: 100,
    monthlyReset: false,
    allowedModels: ["llama-3.1-8b-instant"],
    features: {
      resumeBuilder: true,
      aiTailor: false,
      mockInterview: true,
      realTimeInterview: true,
      desktopApp: false,
      cameraMode: false,
      sessionRecordings: false,
    },
  },
  basic: {
    label: "Basic",
    totalCredits: 1000,
    monthlyReset: true,
    price: 12,
    stripePriceId: "", // Set after creating Stripe product
    allowedModels: ["llama-3.1-8b-instant", "gpt-4o-mini"],
    features: {
      resumeBuilder: true,
      aiTailor: true,
      mockInterview: true,
      realTimeInterview: true,
      desktopApp: true,
      cameraMode: false,
      sessionRecordings: false,
    },
  },
  pro: {
    label: "Pro",
    totalCredits: -1, // unlimited
    monthlyReset: true,
    price: 29,
    stripePriceId: "", // Set after creating Stripe product
    allowedModels: ["llama-3.1-8b-instant", "gpt-4o-mini", "gpt-4.1"],
    features: {
      resumeBuilder: true,
      aiTailor: true,
      mockInterview: true,
      realTimeInterview: true,
      desktopApp: true,
      cameraMode: true,
      sessionRecordings: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLAN_CONFIG;

// ── USER PROFILE TYPE ──
export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  plan: PlanId;
  credits: number;
  creditsUsed: number;
  creditsResetDate: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: any;
  lastLogin: any;
};

// ═══════════════════════════════════════════════════════════════
// GET USER PROFILE — returns plan + credits
// ═══════════════════════════════════════════════════════════════
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as UserProfile;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZE USER — called on signup/first login
// ═══════════════════════════════════════════════════════════════
export async function initializeUserCredits(uid: string, email: string, displayName: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Brand new user — give free credits
    await setDoc(ref, {
      uid,
      email,
      displayName: displayName || "User",
      plan: "free",
      credits: PLAN_CONFIG.free.totalCredits,
      creditsUsed: 0,
      creditsResetDate: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    });
  } else {
    // Existing user — just update last login
    await updateDoc(ref, { lastLogin: new Date().toISOString() });
  }
}

// ═══════════════════════════════════════════════════════════════
// CHECK CREDITS — returns true if user can afford the action
// ═══════════════════════════════════════════════════════════════
export async function hasCredits(uid: string, action: CreditAction): Promise<boolean> {
  const profile = await getUserProfile(uid);
  if (!profile) return false;

  const plan = PLAN_CONFIG[profile.plan];

  // Pro = unlimited
  if (plan.totalCredits === -1) return true;

  const cost = CREDIT_COSTS[action];
  return profile.credits >= cost;
}

// ═══════════════════════════════════════════════════════════════
// DEDUCT CREDITS — call AFTER successful action
// ═══════════════════════════════════════════════════════════════
export async function deductCredits(uid: string, action: CreditAction): Promise<{ success: boolean; remaining: number }> {
  const profile = await getUserProfile(uid);
  if (!profile) return { success: false, remaining: 0 };

  const plan = PLAN_CONFIG[profile.plan];
  const cost = CREDIT_COSTS[action];

  // Pro = unlimited, still track usage
  if (plan.totalCredits === -1) {
    await updateDoc(doc(db, "users", uid), {
      creditsUsed: increment(cost),
    });
    return { success: true, remaining: -1 };
  }

  // Check balance
  if (profile.credits < cost) {
    return { success: false, remaining: profile.credits };
  }

  // Deduct
  const newBalance = profile.credits - cost;
  await updateDoc(doc(db, "users", uid), {
    credits: increment(-cost),
    creditsUsed: increment(cost),
  });

  return { success: true, remaining: newBalance };
}

// ═══════════════════════════════════════════════════════════════
// UPGRADE PLAN — called by Stripe webhook
// ═══════════════════════════════════════════════════════════════
export async function upgradePlan(
  uid: string,
  plan: PlanId,
  stripeCustomerId: string,
  stripeSubscriptionId: string
) {
  const planConfig = PLAN_CONFIG[plan];
  const ref = doc(db, "users", uid);

  await updateDoc(ref, {
    plan,
    credits: planConfig.totalCredits === -1 ? 99999 : planConfig.totalCredits,
    creditsUsed: 0,
    creditsResetDate: getNextResetDate(),
    stripeCustomerId,
    stripeSubscriptionId,
  });
}

// ═══════════════════════════════════════════════════════════════
// CANCEL PLAN — revert to free
// ═══════════════════════════════════════════════════════════════
export async function cancelPlan(uid: string) {
  await updateDoc(doc(db, "users", uid), {
    plan: "free",
    credits: 0, // they used their free credits already
    creditsResetDate: null,
    stripeSubscriptionId: null,
  });
}

// ── HELPER ──
function getNextResetDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}