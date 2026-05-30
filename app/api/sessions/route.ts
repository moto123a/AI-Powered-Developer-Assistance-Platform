// app/api/sessions/route.ts
// Handles session save (POST) and load (GET) via Firebase Admin SDK,
// bypassing Firestore client security rules entirely.
//
// Auth: every request must carry a Firebase ID token in the
// Authorization: Bearer <token> header. The token is verified
// server-side and the verified email must match the requested email.

import { NextResponse } from "next/server";
import admin from "firebase-admin";

// ── Admin init ───────────────────────────────────────────────────
function getDb(): admin.firestore.Firestore | null {
  if (admin.apps.length) return admin.firestore();

  const projectId       = process.env.FIREBASE_PROJECT_ID;
  const clientEmail     = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyInput) {
    console.error("[sessions] Firebase env vars missing");
    return null;
  }

  try {
    // Try JSON service-account blob (base64-encoded)
    try {
      const decoded = Buffer.from(privateKeyInput, "base64").toString("utf8");
      const parsed  = JSON.parse(decoded);
      if (parsed.private_key) {
        admin.initializeApp({ credential: admin.credential.cert(parsed) });
        return admin.firestore();
      }
    } catch {}

    // Fallback: raw private key string
    let key = privateKeyInput;
    if (!key.includes("-----BEGIN")) key = Buffer.from(key, "base64").toString("utf8");
    key = key.replace(/^"/, "").replace(/"$/, "").replace(/\\n/g, "\n").trim();

    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey: key }),
    });
    return admin.firestore();
  } catch (e) {
    console.error("[sessions] Admin init error:", e);
    return null;
  }
}

// ── Auth helper ─────────────────────────────────────────────────
// Verifies the Firebase ID token in the Authorization header.
// Returns the verified email on success, null on failure.
async function verifyAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;

  try {
    // Ensure Admin SDK is initialised before calling auth()
    getDb();
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.email ?? null;
  } catch (e) {
    console.warn("[sessions] Token verification failed:", (e as Error).message);
    return null;
  }
}

// ── GET /api/sessions?email=... ──────────────────────────────────
export async function GET(req: Request) {
  const verifiedEmail = await verifyAuth(req);
  if (!verifiedEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestedEmail   = searchParams.get("email");

  if (!requestedEmail) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  // Enforce: the authenticated user can only read their own sessions
  if (verifiedEmail.toLowerCase() !== requestedEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  try {
    const snap = await db
      .collection("interview_sessions")
      .where("userEmail", "==", requestedEmail)
      .get();

    const sessions = snap.docs
      .map(d => {
        const data = d.data();
        return {
          id:            d.id,
          createdAt:     data.createdAt,
          companyName:   data.companyName   || "Unknown",
          role:          data.role          || "Unknown",
          resumeSnippet: data.resumeSnippet || "",
          turns:         data.turns         || [],
          questionCount: data.questionCount || 0,
          durationSecs:  data.durationSecs  || 0,
          // Flatten timestamp so JSON.stringify doesn't lose it
          _createdAtSeconds: data.createdAt?._seconds ?? data.createdAt?.seconds ?? 0,
        };
      })
      // Sort newest-first — no composite index needed
      .sort((a, b) => b._createdAtSeconds - a._createdAtSeconds);

    return NextResponse.json({ sessions });
  } catch (err: any) {
    console.error("[sessions] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/sessions ───────────────────────────────────────────
// Body: { userEmail, sessionId?, companyName, role, resume, turns, durationSecs }
// If sessionId is provided → update existing doc.
// Otherwise → create new doc and return its ID.
export async function POST(req: Request) {
  const verifiedEmail = await verifyAuth(req);
  if (!verifiedEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    userEmail, sessionId,
    companyName, role, resume,
    turns, durationSecs,
  } = body;

  if (!userEmail) {
    return NextResponse.json({ error: "Missing userEmail" }, { status: 400 });
  }

  // Enforce: the authenticated user can only write their own sessions
  if (verifiedEmail.toLowerCase() !== userEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!turns || turns.length === 0) {
    return NextResponse.json({ error: "No turns to save" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const questionCount = (turns as any[]).filter((t: any) => t.role === "interviewer").length;
  const resumeSnippet = ((resume as string) || "").slice(0, 300);

  try {
    if (sessionId) {
      // ── Update existing session ──
      await db.collection("interview_sessions").doc(sessionId).update({
        turns,
        questionCount,
        durationSecs:  durationSecs || 0,
        updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, sessionId });

    } else {
      // ── Create new session ──
      const docRef = await db.collection("interview_sessions").add({
        userEmail,
        companyName:   companyName   || "Unknown",
        role:          role          || "Unknown",
        resumeSnippet,
        turns,
        questionCount,
        durationSecs:  durationSecs || 0,
        createdAt:     admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, sessionId: docRef.id });
    }
  } catch (err: any) {
    console.error("[sessions] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
