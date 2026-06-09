// frontend/app/api/stripe/webhook/route.ts
// ═══════════════════════════════════════════════════════════════
// Stripe Webhook  -  verifies signature then updates Firestore
//
// Setup in Stripe Dashboard:
// 1. Go to dashboard.stripe.com → Developers → Webhooks
// 2. Add endpoint: https://yoursite.com/api/stripe/webhook
// 3. Select events: checkout.session.completed,
//                   customer.subscription.deleted, invoice.paid
// 4. Copy webhook signing secret → add to .env as STRIPE_WEBHOOK_SECRET
// ═══════════════════════════════════════════════════════════════

import { NextResponse }  from "next/server";
import admin             from "firebase-admin";
import crypto            from "node:crypto";

const STRIPE_SECRET  = process.env.STRIPE_SECRET_KEY    || "";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// ── Firebase Admin init ──────────────────────────────────────────
if (!admin.apps.length) {
  const projectId       = process.env.FIREBASE_PROJECT_ID;
  const clientEmail     = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyInput) {
    try {
      let formattedKey = privateKeyInput;
      if (!formattedKey.startsWith("---"))
        formattedKey = Buffer.from(formattedKey, "base64").toString("utf8");
      formattedKey = formattedKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey: formattedKey }),
      });
    } catch (e) {
      console.error("[webhook] Firebase Admin init error:", e);
    }
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// ── Plan credit amounts ──────────────────────────────────────────
const PLAN_CREDITS: Record<string, number> = {
  basic: 1000,
  pro:   99999, // unlimited sentinel
};

// ── Stripe signature verification ───────────────────────────────
// Implements https://stripe.com/docs/webhooks/signatures manually
// using HMAC-SHA256  -  no Stripe SDK needed.
function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): boolean {
  if (!secret || !sigHeader) return false;
  try {
    // sigHeader format: "t=<timestamp>,v1=<hmac>,v1=<hmac2>,..."
    const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, part) => {
      const eq = part.indexOf("=");
      if (eq !== -1) acc[part.slice(0, eq)] = part.slice(eq + 1);
      return acc;
    }, {});

    const timestamp = parts["t"];
    const v1        = parts["v1"];
    if (!timestamp || !v1) return false;

    // Reject events older than 5 minutes (replay attack protection)
    const diff = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (diff > 300) {
      console.warn("[webhook] Rejected: event timestamp too old:", diff, "seconds");
      return false;
    }

    const payload  = `${timestamp}.${rawBody}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const expBuf = Buffer.from(expected, "hex");
    const v1Buf  = Buffer.from(v1,       "hex");
    if (expBuf.length !== v1Buf.length) return false;
    return crypto.timingSafeEqual(expBuf, v1Buf);
  } catch (e) {
    console.error("[webhook] Signature verification error:", e);
    return false;
  }
}

function getNextResetDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── POST /api/stripe/webhook ─────────────────────────────────────
export async function POST(req: Request) {
  // Must read raw body BEFORE any JSON parsing  -  Stripe verifies against raw bytes
  const rawBody = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";

  // Reject if secret not configured in env
  if (!WEBHOOK_SECRET) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set  -  rejecting all events");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify signature  -  reject anything that doesn't match
  if (!verifyStripeSignature(rawBody, sigHeader, WEBHOOK_SECRET)) {
    console.warn("[webhook] Signature verification FAILED  -  possible replay or forgery");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!db) {
    console.error("[webhook] Firebase Admin not initialized");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  try {
    // ── CHECKOUT COMPLETED  -  user just paid ──────────────────────
    if (event.type === "checkout.session.completed") {
      const session      = event.data.object;
      const uid          = session.metadata?.uid;
      const plan         = session.metadata?.plan;
      const customerId   = session.customer;
      const subscriptionId = session.subscription;

      if (!uid || !plan) {
        console.error("[webhook] Missing uid or plan in session metadata");
        return NextResponse.json({ received: true });
      }

      if (!["basic", "pro"].includes(plan)) {
        console.error("[webhook] Unknown plan in metadata:", plan);
        return NextResponse.json({ received: true });
      }

      console.log(`✅ PAYMENT: ${uid} → ${plan} | Customer: ${customerId}`);

      const userRef = db.collection("users").doc(uid);
      const credits = PLAN_CREDITS[plan] ?? 1000;

      await userRef.update({
        plan,
        credits,
        creditsUsed:      0,
        creditsResetDate: getNextResetDate(),
        stripeCustomerId:     customerId     ?? null,
        stripeSubscriptionId: subscriptionId ?? null,
      });

      console.log(`✅ Firestore updated: ${uid} → plan=${plan}, credits=${credits}`);
    }

    // ── SUBSCRIPTION CANCELED  -  revert to free ───────────────────
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const uid          = subscription.metadata?.uid;

      if (uid) {
        console.log(`⚠️ CANCELED: ${uid}`);
        await db.collection("users").doc(uid).update({
          plan:                 "free",
          credits:              0,
          creditsResetDate:     null,
          stripeSubscriptionId: null,
        });
      }
    }

    // ── INVOICE PAID  -  monthly credit renewal ────────────────────
    if (event.type === "invoice.paid" && STRIPE_SECRET) {
      const invoice        = event.data.object;
      const subscriptionId = invoice.subscription;

      if (subscriptionId) {
        const subRes = await fetch(
          `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
          { headers: { Authorization: `Bearer ${STRIPE_SECRET}` } }
        );
        const sub = await subRes.json();
        const uid  = sub.metadata?.uid;
        const plan = sub.metadata?.plan;

        if (uid && plan && ["basic", "pro"].includes(plan)) {
          const credits = PLAN_CREDITS[plan] ?? 1000;
          await db.collection("users").doc(uid).update({
            credits,
            creditsUsed:      0,
            creditsResetDate: getNextResetDate(),
          });
          console.log(`🔄 RENEWED: ${uid} → ${credits} credits`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[webhook] Handler error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
