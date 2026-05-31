// app/api/admin/route.ts
// ═══════════════════════════════════════════════════════════════
// Server-side admin API — all operations verified by Firebase Admin.
// Only the account matching ADMIN_EMAIL (server-side env var) is
// allowed to call any of these endpoints.
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Admin email is kept server-side only — never exposed in the client bundle
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "krishnapk288@gmail.com").toLowerCase();

// ── Firebase Admin init (shared singleton) ──────────────────────
function getDb(): admin.firestore.Firestore | null {
  if (admin.apps.length) return admin.firestore();

  const projectId       = process.env.FIREBASE_PROJECT_ID;
  const clientEmail     = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyInput) {
    console.error("[admin] Firebase env vars missing");
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
    console.error("[admin] Admin init error:", e);
    return null;
  }
}

// ── Verify that the caller is the admin ─────────────────────────
async function verifyAdmin(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;

  try {
    getDb(); // ensure admin is initialised
    const decoded = await admin.auth().verifyIdToken(token);
    const email   = (decoded.email ?? "").toLowerCase();
    if (email !== ADMIN_EMAIL) return null;
    return decoded.email ?? null;
  } catch {
    return null;
  }
}

// ── GET /api/admin — list all users + downloads ──────────────────
export async function GET(req: Request) {
  const adminEmail = await verifyAdmin(req);
  if (!adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  try {
    const [usersSnap, dlSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("app_downloads").get(),
    ]);

    return NextResponse.json({
      users:     usersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      downloads: dlSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    });
  } catch (err: any) {
    console.error("[admin] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/admin — mutate user records ────────────────────────
// Actions:
//   updatePlan    — { action, userId, plan, credits }
//   updateCredits — { action, userId, credits }
//   deleteUser    — { action, userId }
export async function POST(req: Request) {
  const adminEmail = await verifyAdmin(req);
  if (!adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    if (action === "updatePlan") {
      const { plan, credits } = body;
      if (!plan || typeof credits !== "number") {
        return NextResponse.json({ error: "Missing plan or credits" }, { status: 400 });
      }
      await db.collection("users").doc(userId).update({ plan, credits });
      return NextResponse.json({ success: true });
    }

    if (action === "updateCredits") {
      const { credits } = body;
      if (typeof credits !== "number") {
        return NextResponse.json({ error: "Missing credits" }, { status: 400 });
      }
      await db.collection("users").doc(userId).update({ credits });
      return NextResponse.json({ success: true });
    }

    if (action === "deleteUser") {
      await db.collection("users").doc(userId).delete();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[admin] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
