// frontend/app/api/stripe/checkout/route.ts
// ═══════════════════════════════════════════════════════════════
// Creates Stripe Checkout session for Basic ($12) or Pro ($29)
// After payment, Stripe redirects to /pricing?success=true
// Stripe webhook updates Firestore plan + credits
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";

// ── STRIPE PRICE IDS — create these in Stripe Dashboard ──
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
    const { plan, annual, uid, email } = await req.json();

    if (!STRIPE_SECRET || STRIPE_SECRET.length < 10) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

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