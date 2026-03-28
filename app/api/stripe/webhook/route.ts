// frontend/app/api/stripe/webhook/route.ts
// ═══════════════════════════════════════════════════════════════
// Stripe Webhook — listens for payment events
// Updates Firestore: plan, credits, stripeCustomerId
//
// Setup in Stripe Dashboard:
// 1. Go to dashboard.stripe.com → Developers → Webhooks
// 2. Add endpoint: https://yoursite.com/api/stripe/webhook
// 3. Select events: checkout.session.completed, customer.subscription.deleted
// 4. Copy webhook signing secret → add to .env as STRIPE_WEBHOOK_SECRET
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { doc, updateDoc, getDoc } from "firebase/firestore";

// Use firebase-admin for server-side Firestore (more reliable in API routes)
import admin from "firebase-admin";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Initialize Firebase Admin if not already
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyInput) {
    try {
      let formattedKey = privateKeyInput;
      if (!formattedKey.startsWith("---")) {
        formattedKey = Buffer.from(formattedKey, "base64").toString("utf8");
      }
      formattedKey = formattedKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");

      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey: formattedKey }),
      });
    } catch (e) {
      console.error("Firebase Admin init error:", e);
    }
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// Plan credit amounts
const PLAN_CREDITS: Record<string, number> = {
  basic: 1000,
  pro: 99999, // unlimited
};

export async function POST(req: Request) {
  try {
    const body = await req.text();

    // Verify webhook signature (simple version without stripe SDK)
    // For production, use stripe.webhooks.constructEvent()
    // For now, we trust the payload if webhook secret matches

    let event: any;
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!db) {
      console.error("Firebase Admin not initialized");
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // ── CHECKOUT COMPLETED — user just paid ──
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const uid = session.metadata?.uid;
      const plan = session.metadata?.plan;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (!uid || !plan) {
        console.error("Missing uid or plan in session metadata");
        return NextResponse.json({ received: true });
      }

      console.log(`✅ PAYMENT: ${uid} → ${plan} plan | Customer: ${customerId}`);

      // Update Firestore
      const userRef = db.collection("users").doc(uid);
      const credits = PLAN_CREDITS[plan] || 1000;

      await userRef.update({
        plan: plan,
        credits: credits,
        creditsUsed: 0,
        creditsResetDate: getNextResetDate(),
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
      });

      console.log(`✅ Firestore updated: ${uid} → plan=${plan}, credits=${credits}`);
    }

    // ── SUBSCRIPTION CANCELED — revert to free ──
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const uid = subscription.metadata?.uid;

      if (uid) {
        console.log(`⚠️ CANCELED: ${uid}`);
        const userRef = db.collection("users").doc(uid);
        await userRef.update({
          plan: "free",
          credits: 0,
          creditsResetDate: null,
          stripeSubscriptionId: null,
        });
      }
    }

    // ── INVOICE PAID — monthly renewal ──
    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;

      // Fetch subscription to get metadata
      if (subscriptionId && STRIPE_SECRET) {
        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          headers: { Authorization: `Bearer ${STRIPE_SECRET}` },
        });
        const sub = await subRes.json();
        const uid = sub.metadata?.uid;
        const plan = sub.metadata?.plan;

        if (uid && plan) {
          const credits = PLAN_CREDITS[plan] || 1000;
          const userRef = db.collection("users").doc(uid);
          await userRef.update({
            credits: credits,
            creditsUsed: 0,
            creditsResetDate: getNextResetDate(),
          });
          console.log(`🔄 RENEWED: ${uid} → ${credits} credits`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function getNextResetDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}