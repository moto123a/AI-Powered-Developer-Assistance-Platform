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
      userEmail: email || "Anonymous",
      service,
      transcript: details.transcript || "",
      durationSeconds: details.duration || 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      mode: details.mode || "chat",
    });
    if (email) {
      const userQuery = await db.collection("users").where("email", "==", email).limit(1).get();
      if (!userQuery.empty) {
        await userQuery.docs[0].ref.update({
          usageCount: admin.firestore.FieldValue.increment(1),
          totalDurationSeconds: admin.firestore.FieldValue.increment(details.duration || 0),
          lastUsed: admin.firestore.FieldValue.serverTimestamp(),
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
  return (input || "").replace(/[–—−]/g, "-").replace(/\u00A0/g, " ");
}

function sanitizeText(text: string) {
  if (!text) return "";
  return normalizeDashes(text).replace(/[^\x20-\x7E\n]/g, "").slice(0, 30000);
}

function cleanJson(text: string) {
  try {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) return text.substring(firstBrace, lastBrace + 1);
    return "{}";
  } catch {
    return "{}";
  }
}

// ============================================================================
// 4) MODEL ROUTER — routes UI selection to correct API
// ============================================================================
type ModelProvider = "groq" | "openai" | "gemini";

const MODEL_MAP: Record<string, { provider: ModelProvider; apiModel: string }> = {
  // Groq models
  "llama-3.1-8b":        { provider: "groq",   apiModel: "llama-3.1-8b-instant" },
  "llama-3.3-70b":       { provider: "groq",   apiModel: "llama-3.3-70b-versatile" },
  "mixtral-8x7b":        { provider: "groq",   apiModel: "mixtral-8x7b-32768" },
  "llama-3.1-8b-instant":{ provider: "groq",   apiModel: "llama-3.1-8b-instant" },
  // OpenAI models
  "gpt-4o":              { provider: "openai", apiModel: "gpt-4o" },
  "gpt-4o-mini":         { provider: "openai", apiModel: "gpt-4o-mini" },
  // Gemini models
  "gemini-1.5-pro":      { provider: "gemini", apiModel: "gemini-1.5-pro" },
  "gemini-1.5-flash":    { provider: "gemini", apiModel: "gemini-1.5-flash" },
};

function resolveModel(modelId: string): { provider: ModelProvider; apiModel: string } {
  if (!modelId) return { provider: "groq", apiModel: "llama-3.1-8b-instant" };
  // Try exact match first
  if (MODEL_MAP[modelId]) return MODEL_MAP[modelId];
  // Try lowercase match
  const lower = modelId.toLowerCase();
  if (MODEL_MAP[lower]) return MODEL_MAP[lower];
  // Try partial match
  for (const key of Object.keys(MODEL_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return MODEL_MAP[key];
  }
  // Default to Groq
  console.warn(`⚠️ Unknown model "${modelId}", defaulting to Groq llama-3.1-8b-instant`);
  return { provider: "groq", apiModel: "llama-3.1-8b-instant" };
}

// Shared OpenAI-compatible caller (works for both OpenAI and Groq)
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  apiModel: string,
  messages: any[],
  opts: { temperature?: number; max_tokens?: number; json?: boolean } = {}
): Promise<string> {
  const body: any = {
    model: apiModel,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.max_tokens ?? 1000,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log(`📡 ${baseUrl} status: ${res.status}`);

  if (!res.ok || data.error) {
    console.error(`❌ API error:`, JSON.stringify(data.error || data).slice(0, 300));
    throw new Error(`API error: ${JSON.stringify(data.error?.message || data)}`);
  }
  return data.choices?.[0]?.message?.content || "";
}

// Gemini caller
async function callGemini(
  apiKey: string,
  apiModel: string,
  systemPrompt: string,
  userPrompt: string,
  opts: { temperature?: number; max_tokens?: number } = {}
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          maxOutputTokens: opts.max_tokens ?? 1000,
          responseMimeType: "application/json",
        },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Gemini error: ${JSON.stringify(data.error)}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Main unified LLM caller — pass modelId from UI, it routes automatically
async function callLLM(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  opts: { temperature?: number; max_tokens?: number; json?: boolean } = {}
): Promise<string> {
  const { provider, apiModel } = resolveModel(modelId);
  console.log(`🤖 Calling ${provider} with model: ${apiModel}`);

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing from .env");
    return callGemini(apiKey, apiModel, systemPrompt, userPrompt, opts);
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is missing from .env");
    return callOpenAICompatible("https://api.openai.com/v1", apiKey, apiModel, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], opts);
  }

  // Default: Groq
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is missing from .env");
  return callOpenAICompatible("https://api.groq.com/openai/v1", apiKey, apiModel, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], opts);
}

// ============================================================================
// 5) CREDIT CHECK
// ============================================================================
const CREDIT_COSTS: Record<string, number> = {
  verify_resume: 0,
  generate_script: 5,
  generate_feedback: 5,
  generate_questions: 5,
  realtime: 2,
};

async function checkAndDeductCredits(
  email: string,
  mode: string
): Promise<{ allowed: boolean; remaining: number }> {
  if (!db) return { allowed: true, remaining: -1 };
  const cost = CREDIT_COSTS[mode] ?? 2;
  if (cost === 0) return { allowed: true, remaining: -1 };
  try {
    const userQuery = await db.collection("users").where("email", "==", email).limit(1).get();
    if (userQuery.empty) return { allowed: true, remaining: -1 };
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    const plan = userData.plan || "free";
    const credits = userData.credits || 0;
    if (plan === "pro") {
      await userDoc.ref.update({ creditsUsed: admin.firestore.FieldValue.increment(cost) });
      return { allowed: true, remaining: -1 };
    }
    if (credits < cost) return { allowed: false, remaining: credits };
    await userDoc.ref.update({
      credits: admin.firestore.FieldValue.increment(-cost),
      creditsUsed: admin.firestore.FieldValue.increment(cost),
    });
    return { allowed: true, remaining: credits - cost };
  } catch (err) {
    console.error("Credit check error:", err);
    return { allowed: true, remaining: -1 };
  }
}

// ============================================================================
// 6) DETERMINISTIC RESUME PARSER
// ============================================================================
const NOW_YEAR = 2026;
const NOW_MONTH = 3;
const MERGE_ADJACENT = false;

const monthMap: Record<string, number> = {
  jan:1, january:1, feb:2, february:2, mar:3, march:3, apr:4, april:4, may:5,
  jun:6, june:6, jul:7, july:7, aug:8, august:8, sep:9, sept:9, september:9,
  oct:10, october:10, nov:11, november:11, dec:12, december:12,
};

function toMonthNum(s: string) { return monthMap[s.trim().toLowerCase()] ?? null; }
function monthIndex(y: number, m: number) { return y * 12 + (m - 1); }
function monthsInclusive(s: number, e: number) { return e < s ? 0 : e - s + 1; }
function formatYearsMonths(t: number) { return `${Math.floor(t / 12)} years ${t % 12} months`; }

function sliceProfessionalExperience(resume: string) {
  const lower = resume.toLowerCase();
  const start = lower.indexOf("professional experience");
  if (start === -1) return resume;
  const edu = lower.indexOf("\neducation", start);
  return edu !== -1 ? resume.slice(start, edu) : resume.slice(start);
}

function parseDateRange(text: string) {
  const s = normalizeDashes(text);
  const re = /([A-Za-z]{3,9})\s+(\d{4})\s*(?:-|\sto\s)\s*(present|till\s*date|[A-Za-z]{3,9})\s*(\d{4})?/i;
  const m = s.match(re);
  if (!m) return null;
  const sm = toMonthNum(m[1]), sy = parseInt(m[2]);
  if (!sm || !sy) return null;
  const endToken = (m[3] || "").toLowerCase().replace(/\s+/g, "");
  let em: number, ey: number;
  if (endToken === "present" || endToken === "tilldate") { em = NOW_MONTH; ey = NOW_YEAR; }
  else {
    const endMonth = toMonthNum(m[3]), endYear = m[4] ? parseInt(m[4]) : NaN;
    if (!endMonth || !endYear) return null;
    em = endMonth; ey = endYear;
  }
  return {
    sm, sy, em, ey,
    durationText: `${m[1]} ${m[2]} - ${m[3]}${m[4] ? ` ${m[4]}` : ""}`.replace(/\s+/g, " ").trim(),
  };
}

function extractJobs(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const jobs: any[] = [];
  let lastHeader = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(client:|company:)/i.test(line)) {
      lastHeader = line;
      const p = parseDateRange(line);
      if (p) {
        const sIdx = monthIndex(p.sy, p.sm), eIdx = monthIndex(p.ey, p.em);
        jobs.push({
          label: normalizeDashes(lastHeader).replace(p.durationText, "").replace(/\s+/g, " ").replace(/[|]+/g, " ").trim(),
          durationText: p.durationText, startIdx: sIdx, endIdx: eIdx, months: monthsInclusive(sIdx, eIdx),
        });
        continue;
      }
      const p2 = parseDateRange(lines[i + 1] || "");
      if (p2) {
        const sIdx = monthIndex(p2.sy, p2.sm), eIdx = monthIndex(p2.ey, p2.em);
        jobs.push({
          label: lastHeader.replace(/\s+/g, " ").trim(),
          durationText: p2.durationText, startIdx: sIdx, endIdx: eIdx, months: monthsInclusive(sIdx, eIdx),
        });
      }
      continue;
    }
    if (/^duration\s*:/i.test(line) && lastHeader) {
      const p = parseDateRange(line);
      if (!p) continue;
      const sIdx = monthIndex(p.sy, p.sm), eIdx = monthIndex(p.ey, p.em);
      jobs.push({
        label: lastHeader.replace(/\s+/g, " ").trim(),
        durationText: p.durationText, startIdx: sIdx, endIdx: eIdx, months: monthsInclusive(sIdx, eIdx),
      });
    }
  }
  return jobs;
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

function verifyResumeDeterministic(resumeRaw: string) {
  const resume = sanitizeText(resumeRaw ?? "");
  if (!resume || resume.length < 50)
    return { totalExperience: "0 years 0 months", summary: "Resume text missing/too short." };
  const jobs = extractJobs(sliceProfessionalExperience(resume));
  if (!jobs.length) return {
    totalExperience: "0 years 0 months",
    summary: `Verification Scan (Mar 2026):\n- No job durations found.\nFix format to include:\n  "Client: X || Duration: Nov 2024 - Till Date"`,
  };
  const grossMonths = jobs.reduce((s, j) => s + j.months, 0);
  const merged = mergeIntervals(jobs.map(j => ({ startIdx: j.startIdx, endIdx: j.endIdx })));
  const netMonths = merged.reduce((s, it) => s + monthsInclusive(it.startIdx, it.endIdx), 0);
  const lines = [`Verification Scan (Mar 2026):`, `- Mathematical Audit Result:`];
  jobs.forEach((j, i) => lines.push(`  ${i + 1}. ${j.label} || Duration: ${j.durationText} = ${j.months} months`));
  lines.push(`- Gross Total: ${grossMonths} months (${formatYearsMonths(grossMonths)})`);
  lines.push(merged.length !== jobs.length ? `- Merged overlapping intervals.` : `- No overlaps detected.`);
  lines.push(`- Net Experience: ${netMonths} months (${formatYearsMonths(netMonths)}).`);
  return { totalExperience: formatYearsMonths(netMonths), summary: lines.join("\n") };
}

// ============================================================================
// 7) GET: SPEECHMATICS TOKEN
// ============================================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("email") || "Unknown User";
    const apiKey = process.env.SPEECHMATICS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Key missing" }, { status: 500 });
    const response = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ ttl: 60 }),
    });
    if (!response.ok) return NextResponse.json({ error: "Failed" }, { status: 401 });
    const data = await response.json();
    await logUsageAndIncrement(userEmail, "Speechmatics", { action: "Token Requested" });
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
    const body = await req.json();
    const { transcript, resume, jd, userEmail, duration, mode, question, answer, model } = body;

    // TOKEN INTERCEPTOR
    if (!transcript && !resume && !mode && !question && !answer) {
      const apiKey = process.env.SPEECHMATICS_API_KEY;
      if (apiKey) {
        const smRes = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ ttl: 60 }),
        });
        if (smRes.ok) return NextResponse.json({ token: (await smRes.json()).key_value });
      }
    }

    // Resolve model — reads the "model" field sent from frontend UI
    const selectedModel = model || "llama-3.1-8b";
    const { provider } = resolveModel(selectedModel);
    console.log(`🤖 Selected model: "${selectedModel}" → Provider: ${provider}`);

    // ── VERIFY RESUME (free, no LLM needed) ──
    if (mode === "verify_resume") {
      const result = verifyResumeDeterministic(resume);
      await logUsageAndIncrement(userEmail || "Unknown", "Resume-Verify", { mode: "verify_resume", transcript: "", duration: duration || 0 });
      return NextResponse.json({ totalExperience: result.totalExperience, summary: result.summary });
    }

    // ── CREDIT CHECK ──
    const creditResult = await checkAndDeductCredits(userEmail || "", mode || "realtime");
    if (!creditResult.allowed) {
      return NextResponse.json({
        error: "insufficient_credits",
        message: "You've used all your credits. Upgrade your plan to continue.",
        remaining: creditResult.remaining,
      }, { status: 402 });
    }

    // ════════════════════════════════════════════════════
    // MODE: GENERATE QUESTIONS
    // ════════════════════════════════════════════════════
    if (mode === "generate_questions") {
      const safeResume = sanitizeText(resume);
      const safeJd = sanitizeText(jd);

      try {
        console.log(`🚀 Generating questions via ${selectedModel} (${provider}), resume length: ${safeResume.length}`);

        const systemPrompt = `You are an interview question generator. Return ONLY valid JSON, no markdown, no explanation.\nFormat: {"questions":["question 1","question 2",...,"question 50"]}`;
        const userPrompt = `Generate exactly 50 interview questions.\n\nRESUME:\n${safeResume.slice(0, 2500)}\n\nJOB DESCRIPTION:\n${(safeJd || "Software Engineer role").slice(0, 800)}\n\nRules:\n- Mix technical, behavioral, situational\n- No "Tell me about yourself"\n- No numbering inside strings\n- Return exactly 50 questions`;

        const rawContent = await callLLM(selectedModel, systemPrompt, userPrompt, {
          temperature: 0.3,
          max_tokens: 2500,
          json: true,
        });

        console.log("📝 Raw preview:", rawContent.slice(0, 200));

        let parsed: any = {};
        try { parsed = JSON.parse(rawContent); }
        catch {
          try { parsed = JSON.parse(cleanJson(rawContent)); }
          catch { console.error("❌ JSON parse failed"); return NextResponse.json({ questions: [] }); }
        }

        const questions = Array.isArray(parsed?.questions)
          ? parsed.questions.map((x: any) => String(x || "").trim()).filter(Boolean)
          : [];

        console.log(`✅ Questions generated: ${questions.length} via ${selectedModel}`);
        await logUsageAndIncrement(userEmail || "Unknown", `Questions-${provider}`, { mode: "generate_questions", transcript: "", duration: duration || 0 });
        return NextResponse.json({ questions });

      } catch (err: any) {
        console.error("❌ generate_questions error:", err.message);
        return NextResponse.json({ questions: [] });
      }
    }

    // ════════════════════════════════════════════════════
    // MODE: GENERATE SCRIPT
    // ════════════════════════════════════════════════════
    if (mode === "generate_script") {
      const safeResume = sanitizeText(resume);
      const safeJd = sanitizeText(jd);
      const safeQ = sanitizeText(question);
      const safeA = sanitizeText(answer);

      try {
        const systemPrompt =
          `You're helping someone practice their interview. Write a natural, conversational answer.\n` +
          `Return ONLY this JSON: {"betterAnswerExample":"...","resume_proof":"..."}\n` +
          `- 3-5 sentences max, SHORT and SPECIFIC\n` +
          `- Use REAL facts from the resume\n` +
          `- Start: "Yeah so...", "Absolutely...", "So for that..."\n` +
          `- resume_proof: specific resume detail used. If none: "Resume didn't specify this detail"`;

        const userPrompt = `RESUME:\n${safeResume}\n\nJOB DESCRIPTION:\n${safeJd || "N/A"}\n\nQUESTION:\n${safeQ}\n\nTHEIR ANSWER:\n${safeA}`;

        const rawContent = await callLLM(selectedModel, systemPrompt, userPrompt, { temperature: 0.3, max_tokens: 300, json: true });
        const out = JSON.parse(cleanJson(rawContent));
        await logUsageAndIncrement(userEmail || "Unknown", `Script-${provider}`, { mode: "generate_script", transcript: safeQ, duration: duration || 0 });
        return NextResponse.json({ betterAnswerExample: out?.betterAnswerExample || "", resume_proof: out?.resume_proof || "" });
      } catch {
        return NextResponse.json({ betterAnswerExample: "", resume_proof: "" });
      }
    }

    // ════════════════════════════════════════════════════
    // MODE: GENERATE FEEDBACK
    // ════════════════════════════════════════════════════
    if (mode === "generate_feedback") {
      const safeResume = sanitizeText(resume);
      const safeJd = sanitizeText(jd);
      const safeQ = sanitizeText(question);
      const safeA = sanitizeText(answer);

      try {
        const systemPrompt =
          `You're a practical interview coach.\n` +
          `Return ONLY this JSON: {"score":0-10,"strengths":[...],"improvements":[...],"betterAnswerExample":"...","resume_proof":"..."}\n` +
          `- Score 0-10: clarity, confidence, relevance\n` +
          `- strengths: 2-3 specific things that worked\n` +
          `- improvements: exact wording tips\n` +
          `- betterAnswerExample: SHORT (3-5 sentences), REAL resume facts, conversational\n` +
          `- resume_proof: which resume details you used`;

        const userPrompt = `RESUME:\n${safeResume}\n\nJOB DESCRIPTION:\n${safeJd || "N/A"}\n\nQUESTION:\n${safeQ}\n\nTHEIR ANSWER:\n${safeA}`;

        const rawContent = await callLLM(selectedModel, systemPrompt, userPrompt, { temperature: 0.3, max_tokens: 400, json: true });
        return NextResponse.json(JSON.parse(cleanJson(rawContent)));
      } catch {
        return NextResponse.json({ score: 0, strengths: [], improvements: ["Error getting feedback"], betterAnswerExample: "N/A" });
      }
    }

    // ════════════════════════════════════════════════════
    // MODE: REAL-TIME INTERVIEW
    // ════════════════════════════════════════════════════
    await logUsageAndIncrement(userEmail, `RealTime-${provider}`, { transcript, duration });

    const lowerQ = (transcript || "").toLowerCase().trim();
    const wordCount = (transcript || "").split(/\s+/).length;

    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)[\.,]?\s*$/i.test(lowerQ);
    const isSmallTalk = /how are you|how's it going|how you doing|what's up|wassup|sup/i.test(lowerQ) && wordCount <= 6;
    const isGreetingPlusSmallTalk = /^(hi|hello|hey)[\s,]+.*(how are you|how's it going|how you doing)/i.test(lowerQ);

    const logisticalKeywords = ["relocate","relocation","start date","joining date","how soon","notice period","salary","compensation","ctc","pay","travel","willing to travel","visa","sponsorship","citizenship","work authorization","hybrid","remote","onsite"];
    const behavioralKeywords = ["challenge","conflict","difficult","weakness","strength","describe a time","tell me about a time","mistake","failure","troubleshoot","problem","issue","error","team","pressure","deadline","manage","leadership","greatest achievement","proudest","goal","future","5 years"];

    const isIntroduction = /tell (me|us) about yourself|introduce yourself|walk (me|us) through your (background|resume|experience)/i.test(transcript);
    const isCompanyPitch = /(about|regarding|concerning) (the company|our company|this company|us|our organization)/i.test(transcript)
      || /day to day|daily (duties|responsibilities)|what (you|you'll) (do|be doing)/i.test(transcript)
      || wordCount > 80;
    const isLogistical = logisticalKeywords.some(kw => lowerQ.includes(kw));
    const isBehavioral = behavioralKeywords.some(kw => lowerQ.includes(kw));

    let systemInstruction = "";
    if (isGreeting && !isSmallTalk && !isGreetingPlusSmallTalk) {
      systemInstruction = `Simple greeting. Reply with ONE word only. "Hello"→"Hi". Nothing else.`;
    } else if (isSmallTalk || isGreetingPlusSmallTalk) {
      systemInstruction = `Professional interview small talk. ONE short professional sentence. No personal life mentions.`;
    } else if (isCompanyPitch || wordCount > 80) {
      systemInstruction = `Interviewer gave a long intro. Acknowledge in 10-15 words max. Show interest. Do NOT explain your background.`;
    } else if (isIntroduction) {
      systemInstruction = `Introduce yourself. 4-6 sentences: current role, specific tasks from resume, one achievement, why this job. Start: "Yeah, so..." Be conversational.`;
    } else if (isLogistical) {
      systemInstruction = `Simple HR question. Answer in 1 sentence only. Be direct.`;
    } else if (isBehavioral) {
      systemInstruction = `Give a real example from CURRENT job first. 3-5 sentences: situation, what you did (specific tools), result. Start: "Yeah, so..." Keep it SHORT and REAL.`;
    } else {
      systemInstruction = `Answer the question. Simple=1-2 sentences, process=3-4, complex=4-6. Use REAL resume details. Start naturally. NO generic theory.`;
    }

    const rawAnswer = await callLLM(
      selectedModel,
      systemInstruction,
      `RESUME:\n${sanitizeText(resume)}\n\nINTERVIEWER: "${transcript}"\n\nGive a natural, SHORT answer using real details from the resume.`,
      { temperature: 0.3, max_tokens: 200 }
    );

    const aiAns = rawAnswer
      .replace(/^(Based on the resume|As the candidate|I see that|According to|The resume mentions|Looking at your resume|From my background|As mentioned in|My background|As per)/i, "")
      .replace(/^(I have extensive experience|I primarily use|With my experience|In my experience)/i, "")
      .replace(/^(Thank you for|Thanks for the|I appreciate)/i, "")
      .trim();

    return NextResponse.json({ answer: aiAns });

  } catch (error: any) {
    console.error("API Error", error);
    return NextResponse.json({ score: 0 });
  }
}