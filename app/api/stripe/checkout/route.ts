// frontend/app/api/stripe/checkout/route.ts
// ═══════════════════════════════════════════════════════════════
// Creates Stripe Checkout session for Basic ($12) or Pro ($29)
// After payment, Stripe redirects to /pricing?success=true
// Stripe webhook updates Firestore plan + credits
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import admin from "firebase-admin";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";

// ── Firebase Admin init (shared singleton) ──────────────────────
function ensureAdminInit() {
  if (admin.apps.length) return;
  const projectId       = process.env.FIREBASE_PROJECT_ID;
  const clientEmail     = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyInput) return;
  try {
    let key = privateKeyInput;
    if (!key.includes("-----BEGIN")) key = Buffer.from(key, "base64").toString("utf8");
    key = key.replace(/^"/, "").replace(/"$/, "").replace(/\\n/g, "\n").trim();
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey: key }) });
  } catch (e) {
    console.error("[checkout] Firebase Admin init error:", e);
  }
}

// ── STRIPE PRICE IDS  -  create these in Stripe Dashboard ──
// Go to: dashboard.stripe.com → Products → Create Product
// Create "Basic Monthly" → $12/mo → copy price ID (price_xxxx)
// Create "Basic Annual" → $96/yr → copy price ID
// Create "Pro Monthly" → $29/mo → copy price ID
// Create "Pro Annual" → $228/yr → copy price ID
// Paste them below:
const PRICE_IDS: Record<string, string> = {
  basic_monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE || "price_REPLACE_ME",
  basic_annual: process.env.STRIPE_BASIC_ANNUAL_PRICE || "price_REPLACE_ME",
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE || "price_REPLACE_ME",
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE || "price_REPLACE_ME",
};

export async function POST(req: Request) {
  try {
    // ── VERIFY FIREBASE ID TOKEN ──────────────────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    ensureAdminInit();
    let verifiedUid: string;
    let verifiedEmail: string | undefined;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      verifiedUid   = decoded.uid;
      verifiedEmail = decoded.email;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, annual, uid } = await req.json();

    if (!STRIPE_SECRET || STRIPE_SECRET.length < 10) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    // Reject unknown plans  -  prevents crafted requests from creating
    // checkout sessions with arbitrary metadata values.
    if (!plan || !["basic", "pro"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Verify the requested uid matches the authenticated user
    if (!uid || uid !== verifiedUid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Always use server-verified email, not client-supplied value
    const email = verifiedEmail ?? "";

    const priceKey = `${plan}_${annual ? "annual" : "monthly"}`;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId || priceId === "price_REPLACE_ME") {
      return NextResponse.json({ error: `Price ID not set for ${priceKey}` }, { status: 500 });
    }

    // Create Stripe Checkout Session using fetch (no SDK needed)
    const origin = req.headers.get("origin") || "http://localhost:3000";

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", `${origin}/pricing?success=true`);
    params.append("cancel_url", `${origin}/pricing?canceled=true`);
    params.append("customer_email", email || "");
    params.append("metadata[uid]", uid);
    params.append("metadata[plan]", plan);
    params.append("subscription_data[metadata][uid]", uid);
    params.append("subscription_data[metadata][plan]", plan);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (session.error) {
      console.error("Stripe error:", session.error);
      return NextResponse.json({ error: session.error.message }, { status: 400 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}