import { NextResponse } from "next/server";
import admin from "firebase-admin";

export const dynamic = "force-dynamic";

// ============================================================================
// 1) FIREBASE ADMIN
// ============================================================================
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
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
      console.log("✅ Firebase Admin Initialized Successfully");
    } catch (error) {
      console.error("Firebase Init Error:", error);
    }
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// ============================================================================
// 2) LOGGING
// ============================================================================
async function logUsageAndIncrement(email: string, service: string, details: any) {
  if (!db) return;
  try {
    await db.collection("api_usage_logs").add({
      userEmail:       email || "Anonymous",
      service,
      transcript:      details.transcript || "",
      durationSeconds: details.duration   || 0,
      timestamp:       admin.firestore.FieldValue.serverTimestamp(),
      mode:            details.mode       || "chat",
    });
    if (email) {
      const userQuery = await db.collection("users").where("email", "==", email).limit(1).get();
      if (!userQuery.empty) {
        await userQuery.docs[0].ref.update({
          usageCount:           admin.firestore.FieldValue.increment(1),
          totalDurationSeconds: admin.firestore.FieldValue.increment(details.duration || 0),
          lastUsed:             admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.error("Log Error:", err);
  }
}

// ============================================================================
// 3) HELPERS
// ============================================================================
function normalizeDashes(input: string) {
  return (input || "").replace(/[- - −]/g, "-").replace(/\u00A0/g, " ");
}

function sanitizeText(text: string) {
  if (!text) return "";
  const cleaned = normalizeDashes(text).replace(/[^\x20-\x7E\n]/g, "");
  if (cleaned.length > 30000) {
    console.warn(`sanitizeText: input truncated from ${cleaned.length} to 30000 chars`);
  }
  return cleaned.slice(0, 30000);
}

function cleanJson(text: string) {
  try {
    const firstBrace = text.indexOf("{");
    if (firstBrace === -1) return "{}";
    // Walk forward to find the matching closing brace
    let depth = 0;
    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) return text.substring(firstBrace, i + 1);
      }
    }
    return "{}";
  } catch { return "{}"; }
}

// ============================================================================
// 4) MODEL ROUTER
// ============================================================================
type ModelProvider = "groq" | "openai" | "gemini";

const MODEL_MAP: Record<string, { provider: ModelProvider; apiModel: string }> = {
  "llama-3.1-8b":         { provider: "groq",   apiModel: "llama-3.1-8b-instant"     },
  "llama-3.3-70b":        { provider: "groq",   apiModel: "llama-3.3-70b-versatile"  },
  "mixtral-8x7b":         { provider: "groq",   apiModel: "mixtral-8x7b-32768"       },
  "llama-3.1-8b-instant": { provider: "groq",   apiModel: "llama-3.1-8b-instant"     },
  "gpt-4o":               { provider: "openai", apiModel: "gpt-4o"                   },
  "gpt-4o-mini":          { provider: "openai", apiModel: "gpt-4o-mini"              },
  "gemini-1.5-pro":       { provider: "gemini", apiModel: "gemini-1.5-pro"           },
  "gemini-1.5-flash":     { provider: "gemini", apiModel: "gemini-1.5-flash"         },
};

function resolveModel(modelId: string): { provider: ModelProvider; apiModel: string } {
  if (!modelId) return { provider: "groq", apiModel: "llama-3.1-8b-instant" };
  if (MODEL_MAP[modelId]) return MODEL_MAP[modelId];
  const lower = modelId.toLowerCase();
  if (MODEL_MAP[lower]) return MODEL_MAP[lower];
  for (const key of Object.keys(MODEL_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return MODEL_MAP[key];
  }
  console.warn(`⚠️ Unknown model "${modelId}", defaulting to Groq`);
  return { provider: "groq", apiModel: "llama-3.1-8b-instant" };
}

// ── OpenAI-compatible caller (Groq + OpenAI) ──
async function callOpenAICompatible(
  baseUrl:  string,
  apiKey:   string,
  apiModel: string,
  messages: any[],
  opts: { temperature?: number; max_tokens?: number; json?: boolean } = {}
): Promise<string> {
  const body: any = {
    model:       apiModel,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens:  opts.max_tokens  ?? 1000,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res  = await fetch(`${baseUrl}/chat/completions`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`📡 ${baseUrl} status: ${res.status}`);
  if (!res.ok || data.error) {
    console.error(`❌ API error:`, JSON.stringify(data.error || data).slice(0, 300));
    throw new Error(`API error: ${JSON.stringify(data.error?.message || data)}`);
  }
  return data.choices?.[0]?.message?.content || "";
}

// ── Gemini caller ──
async function callGemini(
  apiKey:       string,
  apiModel:     string,
  systemPrompt: string,
  userPrompt:   string,
  opts: { temperature?: number; max_tokens?: number } = {}
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature:      opts.temperature ?? 0.3,
          maxOutputTokens:  opts.max_tokens  ?? 1000,
          responseMimeType: "application/json",
        },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Gemini error: ${JSON.stringify(data.error)}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ── Main unified LLM caller ──
async function callLLM(
  modelId:      string,
  systemPrompt: string,
  userPrompt:   string,
  opts: { temperature?: number; max_tokens?: number; json?: boolean } = {}
): Promise<string> {
  const { provider, apiModel } = resolveModel(modelId);
  console.log(`🤖 Calling ${provider} → ${apiModel}`);

  try {
    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY missing");
      return await callGemini(apiKey, apiModel, systemPrompt, userPrompt, opts);
    }
    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY missing");
      return await callOpenAICompatible("https://api.openai.com/v1", apiKey, apiModel, [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ], opts);
    }
    // Default: Groq
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing");
    return await callOpenAICompatible("https://api.groq.com/openai/v1", apiKey, apiModel, [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   },
    ], opts);
  } catch (err: any) {
    const msg = err?.message || String(err);
    throw new Error(`[${provider}/${apiModel}] ${msg}`);
  }
}

// ── NEW: caller that accepts pre-built messages array ──
// Used by promptBuilder.ts which sends full conversation history
async function callLLMWithMessages(
  modelId:  string,
  messages: any[],
  opts: { temperature?: number; max_tokens?: number } = {}
): Promise<string> {
  const { provider, apiModel } = resolveModel(modelId);
  console.log(`🤖 callLLMWithMessages → ${provider} ${apiModel} | ${messages.length} messages`);

  if (provider === "gemini") {
    // Gemini needs system + user separated
    const systemMsg = messages.find(m => m.role === "system")?.content || "";
    const userMsg   = messages.filter(m => m.role !== "system")
      .map(m => `${m.role === "user" ? "Interviewer" : "You"}: ${m.content}`)
      .join("\n\n");
    const apiKey    = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");
    return callGemini(apiKey, apiModel, systemMsg, userMsg, opts);
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");
    return callOpenAICompatible(
      "https://api.openai.com/v1", apiKey, apiModel, messages, opts
    );
  }

  // Default: Groq
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing");
  return callOpenAICompatible(
    "https://api.groq.com/openai/v1", apiKey, apiModel, messages, opts
  );
}

// ============================================================================
// 5) CREDIT CHECK
// ============================================================================
const CREDIT_COSTS: Record<string, number> = {
  verify_resume:      0,
  generate_script:    5,
  generate_feedback:  5,
  generate_questions: 5,
  realtime:           2,
};

// ── Monthly credit caps per plan (single source of truth for enforcement) ──
// Sized so worst-case API cost stays under plan revenue → always profitable.
// Refills every month via the lazy reset below.
const PLAN_MONTHLY_CREDITS: Record<string, number> = {
  free:     100,
  pro:      5000,
  lifetime: 5000,
  teams:    10000,
};

// Owner/internal accounts are never charged (so testing isn't capped).
const UNLIMITED_EMAILS = new Set([
  (process.env.ADMIN_EMAIL || "krishnapk288@gmail.com").toLowerCase(),
]);

// First day of next month, midnight — when the monthly allowance refills.
function nextResetISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function checkAndDeductCredits(
  email: string,
  mode:  string
): Promise<{ allowed: boolean; remaining: number }> {
  if (!db) return { allowed: true, remaining: -1 };
  const cost = CREDIT_COSTS[mode] ?? 2;
  if (cost === 0) return { allowed: true, remaining: -1 };

  // Owner/internal accounts: unlimited, just track usage.
  if (email && UNLIMITED_EMAILS.has(email.toLowerCase())) {
    try {
      const q = await db.collection("users").where("email", "==", email).limit(1).get();
      if (!q.empty) await q.docs[0].ref.update({ creditsUsed: admin.firestore.FieldValue.increment(cost) });
    } catch {}
    return { allowed: true, remaining: -1 };
  }

  try {
    const userQuery = await db.collection("users").where("email", "==", email).limit(1).get();
    if (userQuery.empty) return { allowed: true, remaining: -1 };
    const userDoc  = userQuery.docs[0];
    const userData = userDoc.data();
    const plan     = userData.plan || "free";
    const cap      = PLAN_MONTHLY_CREDITS[plan] ?? PLAN_MONTHLY_CREDITS.free;
    let   credits  = typeof userData.credits === "number" ? userData.credits : cap;

    // ── Lazy monthly reset ──────────────────────────────────────
    // If the reset date has passed, refill to this plan's cap before
    // charging. This is what makes capped plans sustainable — without
    // it a user who hit 0 would be stuck forever.
    const resetAt = userData.creditsResetDate ? Date.parse(userData.creditsResetDate) : 0;
    if (resetAt && Date.now() >= resetAt) {
      credits = cap;
      await userDoc.ref.update({ credits: cap, creditsUsed: 0, creditsResetDate: nextResetISO() });
    } else if (!userData.creditsResetDate) {
      // Backfill a reset date for older docs that never had one.
      await userDoc.ref.update({ creditsResetDate: nextResetISO() });
    }

    if (credits < cost) return { allowed: false, remaining: credits };
    await userDoc.ref.update({
      credits:     admin.firestore.FieldValue.increment(-cost),
      creditsUsed: admin.firestore.FieldValue.increment(cost),
    });
    return { allowed: true, remaining: credits - cost };
  } catch (err) {
    console.error("Credit check error:", err);
    return { allowed: true, remaining: -1 };
  }
}

// ============================================================================
// 6) DETERMINISTIC RESUME PARSER  (works with any common resume format)
// ============================================================================
const NOW_YEAR      = new Date().getFullYear();
const NOW_MONTH     = new Date().getMonth() + 1;
const MERGE_ADJACENT = false;

const monthMap: Record<string, number> = {
  jan:1, january:1, feb:2, february:2, mar:3, march:3, apr:4, april:4, may:5,
  jun:6, june:6, jul:7, july:7, aug:8, august:8, sep:9, sept:9, september:9,
  oct:10, october:10, nov:11, november:11, dec:12, december:12,
};

function toMonthNum(s: string)            { return monthMap[s.trim().toLowerCase()] ?? null; }
function monthIndex(y: number, m: number) { return y * 12 + (m - 1); }
function monthsInclusive(s: number, e: number) {
  if (e < s) return 0;
  return e - s + 1;
}
function formatYearsMonths(t: number) { return `${Math.floor(t / 12)} yrs ${t % 12} mos`; }

// ── Slice the experience section (any common header name) ──
function sliceExperienceSection(resume: string): string {
  const lower = resume.toLowerCase();
  const EXP_HEADERS = [
    "professional experience", "work experience", "employment history",
    "career history", "work history", "relevant experience", "experience",
  ];
  const END_HEADERS = [
    "\neducation", "\nskills", "\ncertification", "\nprojects",
    "\ntraining", "\naccomplishment", "\nachievement", "\nreferences",
    "\nadditional", "\nlanguage", "\npublication", "\nvolunteer",
    "\naward", "\nhonor",
  ];
  let start = -1;
  for (const h of EXP_HEADERS) {
    const idx = lower.indexOf(h);
    if (idx !== -1) { start = idx; break; }
  }
  if (start === -1) return resume; // no experience section  -  scan everything
  let end = -1;
  for (const e of END_HEADERS) {
    const idx = lower.indexOf(e, start + 20);
    if (idx !== -1 && (end === -1 || idx < end)) end = idx;
  }
  return end !== -1 ? resume.slice(start, end) : resume.slice(start);
}

// ── Parse a single date range string into {sm,sy,em,ey} ──
// Handles: "Jan 2020 - Mar 2022",  "2020 - 2023",  "01/2020 - 03/2022",
//          "Jan 2020 to Present",  "2020 - current", "May 2021 - Till Date"
function parseDateRange(text: string): {
  sm: number; sy: number; em: number; ey: number; durationText: string;
} | null {
  const s = normalizeDashes(text);
  const isPresent = (t: string) =>
    /^(present|current|now|till\s*date|ongoing|date)$/i.test(t.trim().replace(/\s+/g, " "));

  // ─ Pattern 1: "MonthName YYYY - MonthName YYYY" or "MonthName YYYY - Present"
  const re1 = /([A-Za-z]{3,9})\s+(\d{4})\s*(?:-|to)\s*([A-Za-z][A-Za-z\s]*?)(\d{4})?(?=\s|$|[,;|])/i;
  const m1  = s.match(re1);
  if (m1) {
    const sm = toMonthNum(m1[1]), sy = parseInt(m1[2]);
    if (sm && sy && sy >= 1990 && sy <= NOW_YEAR + 1) {
      const endStr = (m1[3] || "").trim();
      let em: number | null = null, ey: number | null = null;
      if (isPresent(endStr)) {
        em = NOW_MONTH; ey = NOW_YEAR;
      } else {
        const endM = toMonthNum(endStr);
        const endY = m1[4] ? parseInt(m1[4]) : NaN;
        if (endM && endY && endY >= 1990) { em = endM; ey = endY; }
      }
      if (em !== null && ey !== null) {
        return { sm, sy, em, ey, durationText: m1[0].trim() };
      }
    }
  }

  // ─ Pattern 2: "YYYY - YYYY" or "YYYY - Present"
  const re2 = /\b((?:19|20)\d{2})\s*[--]\s*(present|current|now|till\s*date|ongoing|(?:19|20)\d{2})\b/i;
  const m2  = s.match(re2);
  if (m2) {
    const sy = parseInt(m2[1]);
    let em: number, ey: number;
    if (isPresent(m2[2])) { em = NOW_MONTH; ey = NOW_YEAR; }
    else {
      ey = parseInt(m2[2]);
      if (ey < 1990 || ey > NOW_YEAR + 1) return null;
      em = 12;
    }
    return { sm: 1, sy, em, ey, durationText: m2[0].trim() };
  }

  // ─ Pattern 3: "MM/YYYY - MM/YYYY" or "MM/YYYY - Present"
  const re3 = /(\d{1,2})\/(\d{4})\s*[--]\s*(present|current|now|\d{1,2}\/\d{4})/i;
  const m3  = s.match(re3);
  if (m3) {
    const sm = parseInt(m3[1]), sy = parseInt(m3[2]);
    if (sm < 1 || sm > 12 || sy < 1990) return null;
    let em: number, ey: number;
    if (isPresent(m3[3])) { em = NOW_MONTH; ey = NOW_YEAR; }
    else {
      const ep = m3[3].split("/");
      em = parseInt(ep[0]); ey = parseInt(ep[1]);
      if (em < 1 || em > 12 || ey < 1990) return null;
    }
    return { sm, sy, em, ey, durationText: m3[0].trim() };
  }

  return null;
}

// ── Extract jobs from any resume text ──
function extractJobs(text: string) {
  const lines  = text.split("\n").map(l => l.trim()).filter(Boolean);
  const jobs: any[] = [];
  const usedLines = new Set<number>();

  // ── Pass 1: legacy "Client:/Company:/Duration:" format ──
  let lastHeader = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(client:|company:)/i.test(line)) {
      lastHeader = line;
      const p = parseDateRange(line);
      if (p) {
        const sIdx = monthIndex(p.sy, p.sm), eIdx = monthIndex(p.ey, p.em);
        jobs.push({
          label: normalizeDashes(lastHeader).replace(p.durationText, "").replace(/[|:]+/g, " ").replace(/\s+/g, " ").trim() || lastHeader,
          durationText: p.durationText, startIdx: sIdx, endIdx: eIdx,
          months: monthsInclusive(sIdx, eIdx),
        });
        usedLines.add(i); continue;
      }
      const p2 = parseDateRange(lines[i + 1] || "");
      if (p2) {
        const sIdx = monthIndex(p2.sy, p2.sm), eIdx = monthIndex(p2.ey, p2.em);
        jobs.push({
          label: lastHeader.replace(/\s+/g, " ").trim(),
          durationText: p2.durationText, startIdx: sIdx, endIdx: eIdx,
          months: monthsInclusive(sIdx, eIdx),
        });
        usedLines.add(i); usedLines.add(i + 1); continue;
      }
      continue;
    }
    if (/^duration\s*:/i.test(line) && lastHeader) {
      const p = parseDateRange(line);
      if (!p) continue;
      const sIdx = monthIndex(p.sy, p.sm), eIdx = monthIndex(p.ey, p.em);
      jobs.push({
        label: lastHeader.replace(/\s+/g, " ").trim(),
        durationText: p.durationText, startIdx: sIdx, endIdx: eIdx,
        months: monthsInclusive(sIdx, eIdx),
      });
      usedLines.add(i); continue;
    }
  }

  // ── Pass 2: broad scan  -  any line (or adjacent line) with a date range ──
  // Only runs if pass 1 found nothing
  if (jobs.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      if (usedLines.has(i)) continue;
      const line = lines[i];

      // Date range IS in this line
      const p = parseDateRange(line);
      if (p) {
        // Label: everything in this line minus the date part, or fall back to prev line
        const stripped = line.replace(p.durationText, "").replace(/[|·•\--]+/g, " ").replace(/\s+/g, " ").trim();
        const label    = stripped.length >= 3 ? stripped : (i > 0 ? lines[i - 1].slice(0, 80) : "Position");
        const sIdx = monthIndex(p.sy, p.sm), eIdx = monthIndex(p.ey, p.em);
        jobs.push({ label, durationText: p.durationText, startIdx: sIdx, endIdx: eIdx, months: monthsInclusive(sIdx, eIdx) });
        usedLines.add(i); continue;
      }

      // Date range is on the NEXT line (standard resume: title line, then date line)
      if (i + 1 < lines.length && !usedLines.has(i + 1)) {
        const p2 = parseDateRange(lines[i + 1]);
        if (p2) {
          const sIdx = monthIndex(p2.sy, p2.sm), eIdx = monthIndex(p2.ey, p2.em);
          jobs.push({ label: line.slice(0, 80), durationText: p2.durationText, startIdx: sIdx, endIdx: eIdx, months: monthsInclusive(sIdx, eIdx) });
          usedLines.add(i); usedLines.add(i + 1); i++; continue;
        }
      }
    }
  }

  // Deduplicate by startIdx (keep first occurrence)
  const seen = new Set<number>();
  return jobs.filter(j => {
    if (seen.has(j.startIdx)) return false;
    seen.add(j.startIdx); return true;
  });
}

function mergeIntervals(intervals: any[]) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.startIdx - b.startIdx);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = merged[merged.length - 1], next = sorted[i];
    if (MERGE_ADJACENT ? next.startIdx <= cur.endIdx + 1 : next.startIdx <= cur.endIdx)
      cur.endIdx = Math.max(cur.endIdx, next.endIdx);
    else merged.push({ ...next });
  }
  return merged;
}

function verifyResumeDeterministic(resumeRaw: string): {
  totalExperience: string; summary: string; hasJobs: boolean;
} {
  const resume = sanitizeText(resumeRaw ?? "");
  if (!resume || resume.length < 50)
    return { totalExperience: "0 years 0 months", summary: "Resume text missing or too short.", hasJobs: false };
  const jobs = extractJobs(sliceExperienceSection(resume));
  if (!jobs.length) return {
    totalExperience: "0 years 0 months",
    summary: "Could not parse date ranges automatically.",
    hasJobs: false,
  };
  const grossMonths = jobs.reduce((s, j) => s + j.months, 0);
  const merged      = mergeIntervals(jobs.map(j => ({ startIdx: j.startIdx, endIdx: j.endIdx })));
  const netMonths   = merged.reduce((s, it) => s + monthsInclusive(it.startIdx, it.endIdx), 0);
  const lines       = [`Resume Verification:`];
  jobs.forEach((j, idx) => lines.push(`  ${idx + 1}. ${j.label} | ${j.durationText} = ${j.months} mos`));
  lines.push(`Gross total : ${formatYearsMonths(grossMonths)}`);
  lines.push(merged.length !== jobs.length ? `(overlapping roles merged)` : ``);
  lines.push(`Net total   : ${formatYearsMonths(netMonths)}`);
  return { totalExperience: formatYearsMonths(netMonths), summary: lines.filter(Boolean).join("\n"), hasJobs: true };
}

// ============================================================================
// 7) GET: SPEECHMATICS TOKEN
// ============================================================================
export async function GET(req: Request) {
  try {
    // Verify Firebase ID token
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    let verifiedEmail = "Unknown User";
    if (idToken && admin.apps.length) {
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        verifiedEmail = decoded.email ?? "Unknown User";
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (idToken === "") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.SPEECHMATICS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Key missing" }, { status: 500 });
    const response = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body:    JSON.stringify({ ttl: 120 }),   // 120s gives more headroom before expiry
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("Speechmatics token error:", response.status, errBody);
      const detail = response.status === 401
        ? "Speechmatics API key is invalid or expired"
        : response.status === 403
          ? "Speechmatics key has no permissions for real-time"
          : response.status === 429
            ? "Speechmatics quota exhausted, upgrade your plan at speechmatics.com"
            : `Speechmatics returned ${response.status}`;
      return NextResponse.json({ error: detail }, { status: response.status });
    }
    const data = await response.json();
    await logUsageAndIncrement(verifiedEmail, "Speechmatics", { action: "Token Requested" });
    return NextResponse.json({ token: data.key_value });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// 8) POST
// ============================================================================
export async function POST(req: Request) {
  try {
    // ── VERIFY FIREBASE ID TOKEN ──────────────────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    let verifiedEmail: string | undefined;
    if (idToken && admin.apps.length) {
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        verifiedEmail = decoded.email ?? undefined;
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      transcript, resume, jd,
      userEmail: bodyEmail, duration,
      mode, question, answer,
      model, messages, context,
    } = body;

    // Always use the server-verified email, never trust the body
    const userEmail = verifiedEmail ?? bodyEmail ?? "";

    // ── MODEL RESTRICTION BY PLAN ────────────────────────────────
    // Free users may only use the fast Llama model.
    // Pro, Lifetime, Teams users have no restriction.
    const FREE_MODELS = ["llama-3.1-8b-instant", "llama-3.1-8b", "llama-3.3-70b", "mixtral-8x7b"];

    let selectedModel = model || "llama-3.1-8b-instant";

    if (db && userEmail) {
      try {
        const userQuery = await db.collection("users").where("email", "==", userEmail).limit(1).get();
        if (!userQuery.empty) {
          const plan = userQuery.docs[0].data().plan || "free";
          if (plan === "free" && !FREE_MODELS.includes(selectedModel)) {
            console.warn(`[model-guard] free user "${userEmail}" tried "${selectedModel}" → clamped to llama`);
            selectedModel = "llama-3.1-8b-instant";
          }
          // pro, lifetime, teams: no restriction
        }
      } catch (err) {
        console.warn("[model-guard] plan lookup failed, proceeding with requested model:", err);
      }
    }

    const { provider }     = resolveModel(selectedModel);
    console.log(`🤖 Model: "${selectedModel}" → ${provider}`);

    // ── VERIFY RESUME ──
    if (mode === "verify_resume") {
      const result = verifyResumeDeterministic(resume);

      // If the deterministic parser couldn't find any dates, fall back to AI
      if (!result.hasJobs) {
        try {
          const aiRaw = await callLLM(
            "llama-3.1-8b-instant",
            `You are a resume parser. Extract all work experience entries with their date ranges and calculate total experience.
Return ONLY this exact JSON (no markdown):
{"totalExperience":"X yrs Y mos","jobs":[{"title":"Job Title at Company","duration":"Mon YYYY - Mon YYYY","months":N}],"summary":"one-line plain summary"}`,
            `Parse this resume:\n\n${sanitizeText(resume).slice(0, 3500)}`,
            { temperature: 0, max_tokens: 500, json: true }
          );
          try {
            const parsed = JSON.parse(cleanJson(aiRaw));
            if (parsed && (parsed.jobs?.length > 0 || parsed.totalExperience)) {
              const jobLines = (parsed.jobs || [])
                .map((j: any, i: number) => `  ${i + 1}. ${j.title} | ${j.duration}${j.months ? ` = ${j.months} mos` : ""}`)
                .join("\n");
              const summary = `Resume Verification (AI scan):\n${jobLines}\nTotal: ${parsed.totalExperience || "See above"}`;
              await logUsageAndIncrement(userEmail || "Unknown", "Resume-Verify-AI", { mode: "verify_resume", transcript: "", duration: 0 });
              return NextResponse.json({ totalExperience: parsed.totalExperience || "See summary", summary });
            }
          } catch { /* fall through to original result */ }
        } catch { /* fall through to original result */ }
      }

      await logUsageAndIncrement(
        userEmail || "Unknown", "Resume-Verify",
        { mode: "verify_resume", transcript: "", duration: duration || 0 }
      );
      return NextResponse.json({ totalExperience: result.totalExperience, summary: result.summary });
    }

    // ── CREDIT CHECK ──
    const creditResult = await checkAndDeductCredits(userEmail || "", mode || "realtime");
    if (!creditResult.allowed) {
      return NextResponse.json({
        error:     "insufficient_credits",
        message:   "You've used all your credits. Upgrade to continue.",
        remaining: creditResult.remaining,
      }, { status: 402 });
    }

    // ════════════════════════════════════════════════════
    // MODE: GENERATE QUESTIONS
    // ════════════════════════════════════════════════════
    if (mode === "generate_questions") {
      const safeResume = sanitizeText(resume);
      const safeJd     = sanitizeText(jd);
      try {
        const systemPrompt = `You are an interview question generator. Return ONLY valid JSON.\nFormat: {"questions":["question 1",...,"question 50"]}`;
        const userPrompt   = `Generate exactly 50 interview questions.\n\nRESUME:\n${safeResume.slice(0, 2500)}\n\nJOB DESCRIPTION:\n${(safeJd || "Software Engineer role").slice(0, 800)}\n\nRules:\n- Mix technical, behavioral, situational\n- No "Tell me about yourself"\n- No numbering inside strings\n- Return exactly 50 questions`;
        const rawContent   = await callLLM(selectedModel, systemPrompt, userPrompt, { temperature: 0.3, max_tokens: 2500, json: true });
        let parsed: any    = {};
        try { parsed = JSON.parse(rawContent); }
        catch { try { parsed = JSON.parse(cleanJson(rawContent)); } catch { return NextResponse.json({ questions: [], error: "Failed to parse AI response. Please try again." }); } }
        const questions = Array.isArray(parsed?.questions)
          ? parsed.questions.map((x: any) => String(x || "").trim()).filter(Boolean)
          : [];
        if (questions.length < 10) {
          console.warn(`generate_questions: only ${questions.length} questions returned, expected 50`);
          return NextResponse.json({ questions: [], error: "Not enough questions generated. Please try again." });
        }
        await logUsageAndIncrement(userEmail || "Unknown", `Questions-${provider}`, { mode: "generate_questions", transcript: "", duration: duration || 0 });
        return NextResponse.json({ questions });
      } catch (err: any) {
        console.error("generate_questions error:", err.message);
        return NextResponse.json({ questions: [], error: "Failed to generate questions. Please try again." });
      }
    }

    // ════════════════════════════════════════════════════
    // MODE: GENERATE SCRIPT
    // ════════════════════════════════════════════════════
    if (mode === "generate_script") {
      const safeResume = sanitizeText(resume);
      const safeJd     = sanitizeText(jd);
      const safeQ      = sanitizeText(question);
      const safeA      = sanitizeText(answer);
      try {
        const systemPrompt =
          `You're helping someone practice their interview. Write a natural, conversational answer.\n` +
          `Return ONLY this JSON: {"betterAnswerExample":"...","resume_proof":"..."}\n` +
          `- 3-5 sentences max, SHORT and SPECIFIC\n` +
          `- Use REAL facts from the resume\n` +
          `- Start: "Yeah so...", "So for that..."\n` +
          `- resume_proof: specific resume detail used`;
        const userPrompt = `RESUME:\n${safeResume}\n\nJD:\n${safeJd || "N/A"}\n\nQ:\n${safeQ}\n\nANSWER:\n${safeA}`;
        const rawContent = await callLLM(selectedModel, systemPrompt, userPrompt, { temperature: 0.3, max_tokens: 300, json: true });
        let out: any = {};
        try { out = JSON.parse(cleanJson(rawContent)); } catch { out = {}; }
        await logUsageAndIncrement(userEmail || "Unknown", `Script-${provider}`, { mode: "generate_script", transcript: safeQ, duration: duration || 0 });
        return NextResponse.json({ betterAnswerExample: out?.betterAnswerExample || "", resume_proof: out?.resume_proof || "" });
      } catch (err: any) {
        console.error("generate_script error:", err.message);
        return NextResponse.json({ betterAnswerExample: "", resume_proof: "", error: "Failed to generate script" });
      }
    }

    // ════════════════════════════════════════════════════
    // MODE: GENERATE FEEDBACK
    // ════════════════════════════════════════════════════
    if (mode === "generate_feedback") {
      const safeResume = sanitizeText(resume);
      const safeJd     = sanitizeText(jd);
      const safeQ      = sanitizeText(question);
      const safeA      = sanitizeText(answer);
      try {
        const systemPrompt =
          `You're a practical interview coach.\n` +
          `Return ONLY this JSON: {"score":0-10,"strengths":[...],"improvements":[...],"betterAnswerExample":"...","resume_proof":"..."}\n` +
          `- Score 0-10: clarity, confidence, relevance\n` +
          `- strengths: 2-3 specific things that worked\n` +
          `- improvements: exact wording tips\n` +
          `- betterAnswerExample: SHORT (3-5 sentences), REAL resume facts\n` +
          `- resume_proof: resume details used`;
        const userPrompt = `RESUME:\n${safeResume}\n\nJD:\n${safeJd || "N/A"}\n\nQ:\n${safeQ}\n\nANSWER:\n${safeA}`;
        const rawContent = await callLLM(selectedModel, systemPrompt, userPrompt, { temperature: 0.3, max_tokens: 400, json: true });
        const parsed = JSON.parse(cleanJson(rawContent));
        return NextResponse.json({
          score:               typeof parsed.score === "number" ? Math.min(10, Math.max(0, parsed.score)) : 0,
          strengths:           Array.isArray(parsed.strengths)    ? parsed.strengths    : [],
          improvements:        Array.isArray(parsed.improvements) ? parsed.improvements : [],
          betterAnswerExample: typeof parsed.betterAnswerExample === "string" ? parsed.betterAnswerExample : "",
          resume_proof:        typeof parsed.resume_proof        === "string" ? parsed.resume_proof        : "",
        });
      } catch {
        return NextResponse.json({ score: 0, strengths: [], improvements: ["Error generating feedback. Please try again."], betterAnswerExample: "", resume_proof: "" });
      }
    }

    // ════════════════════════════════════════════════════
    // MODE: REAL-TIME INTERVIEW
    // ── KEY CHANGE: accepts pre-built messages array
    //    from promptBuilder.ts which includes full
    //    conversation history for per-session memory
    // ════════════════════════════════════════════════════
    await logUsageAndIncrement(
      userEmail, `RealTime-${provider}`, { transcript, duration }
    );

    let rawAnswer = "";

    if (messages && Array.isArray(messages) && messages.length > 0) {
      // ── NEW PATH: use pre-built messages from promptBuilder ──
      // Full conversation history + system prompt + format reminder
      // already assembled on the frontend  -  just pass through
      console.log(`📨 Using promptBuilder messages (${messages.length} turns)`);
      try {
        rawAnswer = await callLLMWithMessages(
          selectedModel,
          messages,
          { temperature: 0.3, max_tokens: 600 }
        );
      } catch (err: any) {
        console.error("callLLMWithMessages error:", err.message);
        return NextResponse.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
      }

    } else {
      // ── LEGACY PATH: old single-turn logic ──
      // Kept for backward compatibility with any
      // other parts of the app still using old format
      console.log(`📨 Using legacy single-turn logic`);
      const lowerQ    = (transcript || "").toLowerCase().trim();
      const wordCount = (transcript || "").split(/\s+/).length;

      const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)[\.,]?\s*$/i.test(lowerQ);
      const isSmallTalk = /how are you|how's it going|how you doing/i.test(lowerQ) && wordCount <= 6;
      const isGreetingPlusSmallTalk = /^(hi|hello|hey)[\s,]+.*(how are you|how's it going)/i.test(lowerQ);

      const logisticalKeywords = ["relocate","relocation","start date","notice period","salary","compensation","ctc","travel","visa","sponsorship","citizenship","work authorization","hybrid","remote","onsite"];
      const behavioralKeywords = ["challenge","conflict","difficult","weakness","strength","describe a time","tell me about a time","mistake","failure","team","pressure","deadline","leadership"];

      const isIntroduction = /tell (me|us) about yourself|introduce yourself|walk (me|us) through/i.test(transcript);
      const isCompanyPitch = wordCount > 80;
      const isLogistical   = logisticalKeywords.some(kw => lowerQ.includes(kw));
      const isBehavioral   = behavioralKeywords.some(kw => lowerQ.includes(kw));

      let systemInstruction = "";
      if (isGreeting && !isSmallTalk && !isGreetingPlusSmallTalk) {
        systemInstruction = `Simple greeting. Reply with ONE word only.`;
      } else if (isSmallTalk || isGreetingPlusSmallTalk) {
        systemInstruction = `Professional small talk. ONE short professional sentence.`;
      } else if (isCompanyPitch) {
        systemInstruction = `Interviewer gave a long intro. Acknowledge in 10-15 words max.`;
      } else if (isIntroduction) {
        systemInstruction = `Introduce yourself. Start with your most recent/current role from the resume. 5-6 bullets using •. Never start with education.`;
      } else if (isLogistical) {
        systemInstruction = `Simple HR question. Answer in 1 sentence only. Be direct.`;
      } else if (isBehavioral) {
        systemInstruction = `Real example from CURRENT job first. 3-5 sentences: situation, tools, result. Start: "Yeah, so..."`;
      } else {
        systemInstruction = `Answer the question. Simple=1-2 sentences, complex=4-5 bullets using •. Use REAL resume details from the provided resume. Lead with the most recent experience.`;
      }

      rawAnswer = await callLLM(
        selectedModel,
        systemInstruction,
        `RESUME:\n${sanitizeText(resume)}\n\nContext: ${context || ""}\n\nINTERVIEWER: "${transcript}"\n\nAnswer naturally using real resume details.`,
        { temperature: 0.3, max_tokens: 400 }
      );
    }

    // ── Clean up AI response ──
    const aiAns = rawAnswer
      .replace(/^(Based on the resume|As the candidate|According to|The resume mentions|Looking at your resume|As mentioned in|My background|As per)/i, "")
      .replace(/^(I have extensive experience|I primarily use|With my experience|In my experience)/i, "")
      .replace(/^(Thank you for|Thanks for the|I appreciate)/i, "")
      .replace(/```[a-z]*|```/g, "")
      .trim();

    return NextResponse.json({ answer: aiAns });

  } catch (error: any) {
    console.error("API Error", error);
    return NextResponse.json({ score: 0 });
  }
}