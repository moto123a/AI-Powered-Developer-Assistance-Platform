// app/api/credits/route.ts
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

    // Old format - raw private key string
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ credits: 0, plan: "free" });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ credits: 0, plan: "free" });
    }

    const snap = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ credits: 0, plan: "free" });
    }

    const data = snap.docs[0].data();
    return NextResponse.json({
      credits: data.credits ?? 0,
      plan: data.plan ?? "free",
    });
  } catch (err: any) {
    console.error("Credits GET error:", err);
    return NextResponse.json({ credits: 0, plan: "free" });
  }
}
