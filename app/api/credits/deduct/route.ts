// frontend/app/api/credits/deduct/route.ts

import { NextResponse } from "next/server";
import admin from "firebase-admin";

function getDb() {
  if (admin.apps.length) return admin.firestore();

  const projectId       = process.env.FIREBASE_PROJECT_ID;
  const clientEmail     = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyInput) {
    console.error("Firebase env vars missing");
    return null;
  }

  try {
    // Try to parse as full JSON service account (new format)
    try {
      const decoded = Buffer.from(privateKeyInput, "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      if (parsed.private_key) {
        admin.initializeApp({
          credential: admin.credential.cert(parsed),
        });
        return admin.firestore();
      }
    } catch (e) {
      // Not JSON, fall through to raw key handling
    }

    // Old format — raw private key string
    let formattedKey = privateKeyInput;
    if (!formattedKey.includes("-----BEGIN")) {
      formattedKey = Buffer.from(formattedKey, "base64").toString("utf8");
    }
    formattedKey = formattedKey.replace(/^"/, "").replace(/"$/, "").replace(/\\n/g, "\n").trim();

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });

    return admin.firestore();
  } catch (e) {
    console.error("Firebase Admin init error:", e);
    return null;
  }
}

const CREDIT_COSTS: Record<string, number> = {
  resume_analysis:        10,
  resume_tailor:          20,
  mock_interview_session: 15,
  mock_feedback:           5,
  mock_script:             5,
  realtime_per_minute:     2,
  question_generation:     5,
  verify_resume:           0,
};

export async function POST(req: Request) {
  try {
    const { uid, action } = await req.json();

    if (!uid || !action) {
      return NextResponse.json({ success: false, error: "Missing uid or action" }, { status: 400 });
    }

    const db = getDb();

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 500 });
    }

    const cost = CREDIT_COSTS[action];
    if (cost === undefined) {
      return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    if (cost === 0) {
      return NextResponse.json({ success: true, remaining: -1 });
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const plan    = userData.plan    || "free";
    const credits = userData.credits || 0;

    if (plan === "pro") {
      await userRef.update({ creditsUsed: admin.firestore.FieldValue.increment(cost) });
      return NextResponse.json({ success: true, remaining: -1, plan: "pro" });
    }

    if (credits < cost) {
      return NextResponse.json({ success: false, error: "Insufficient credits", remaining: credits, needed: cost, plan });
    }

    await userRef.update({
      credits:     admin.firestore.FieldValue.increment(-cost),
      creditsUsed: admin.firestore.FieldValue.increment(cost),
    });

    return NextResponse.json({ success: true, remaining: credits - cost, deducted: cost, plan });
  } catch (err: any) {
    console.error("Credit deduction error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}