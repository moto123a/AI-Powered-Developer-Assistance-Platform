import { NextResponse } from "next/server";
import admin from "firebase-admin";

export const dynamic = "force-dynamic";

// ============================================================================
// 1) FIREBASE ADMIN (KEEP WORKING INIT EXACTLY)
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
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
      console.log("✅ Firebase Admin Initialized Successfully");
    } catch (error) {
      console.error("Firebase Init Error:", error);
    }
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// ============================================================================
// 2) LOGGING (KEEP WORKING)
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
        const userDoc = userQuery.docs[0];
        await userDoc.ref.update({
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
// 3) COMMON HELPERS (SAFE)
// ============================================================================
function normalizeDashes(input: string) {
  return (input || "").replace(/[–—−]/g, "-").replace(/\u00A0/g, " ");
}

function sanitizeText(text: string) {
  if (!text) return "";
  const normalized = normalizeDashes(text);
  return normalized.replace(/[^\x20-\x7E\n]/g, "").slice(0, 30000);
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
// 4) DETERMINISTIC RESUME EXPERIENCE PARSER (REPLACES GROQ verify_resume)
// ============================================================================
const NOW_YEAR = 2026;
const NOW_MONTH = 1; // Jan
const MERGE_ADJACENT = false;

const monthMap: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function toMonthNum(monthStr: string): number | null {
  if (!monthStr) return null;
  const key = monthStr.trim().toLowerCase();
  return monthMap[key] ?? null;
}

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function monthsInclusive(startIdx: number, endIdx: number): number {
  if (endIdx < startIdx) return 0;
  return endIdx - startIdx + 1;
}

function formatYearsMonths(totalMonths: number) {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return `${years} years ${months} months`;
}

function sliceProfessionalExperience(resume: string) {
  const lower = resume.toLowerCase();
  const start = lower.indexOf("professional experience");
  if (start === -1) return resume;

  const edu = lower.indexOf("\neducation", start);
  if (edu !== -1) return resume.slice(start, edu);

  return resume.slice(start);
}

type ParsedRange = {
  sm: number;
  sy: number;
  em: number;
  ey: number;
  durationText: string;
};

function parseDateRange(text: string): ParsedRange | null {
  const s = normalizeDashes(text);

  const re =
    /([A-Za-z]{3,9})\s+(\d{4})\s*(?:-|\sto\s)\s*(present|till\s*date|[A-Za-z]{3,9})\s*(\d{4})?/i;

  const m = s.match(re);
  if (!m) return null;

  const sm = toMonthNum(m[1]);
  const sy = parseInt(m[2], 10);
  if (!sm || !sy) return null;

  const endToken = (m[3] || "").toLowerCase().replace(/\s+/g, "");

  let em: number;
  let ey: number;

  if (endToken === "present" || endToken === "tilldate") {
    em = NOW_MONTH;
    ey = NOW_YEAR;
  } else {
    const endMonth = toMonthNum(m[3]);
    const endYear = m[4] ? parseInt(m[4], 10) : NaN;
    if (!endMonth || !endYear) return null;
    em = endMonth;
    ey = endYear;
  }

  const durationText = `${m[1]} ${m[2]} - ${m[3]}${m[4] ? ` ${m[4]}` : ""}`
    .replace(/\s+/g, " ")
    .trim();

  return { sm, sy, em, ey, durationText };
}

function stripDurationFromLabel(label: string, durationText: string) {
  const cleanLabel = normalizeDashes(label)
    .replace(durationText, "")
    .replace(/\s+/g, " ")
    .replace(/[|]+/g, " ")
    .trim();

  return cleanLabel;
}

type Job = {
  label: string;
  durationText: string;
  months: number;
  startIdx: number;
  endIdx: number;
};

function extractJobs(experienceText: string): Job[] {
  const lines = experienceText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const jobs: Job[] = [];
  let lastHeader = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const isHeader = /^(client:|company:)/i.test(line);
    if (isHeader) {
      lastHeader = line;

      const parsedInline = parseDateRange(line);
      if (parsedInline) {
        const sIdx = monthIndex(parsedInline.sy, parsedInline.sm);
        const eIdx = monthIndex(parsedInline.ey, parsedInline.em);

        const cleanLabel = stripDurationFromLabel(lastHeader, parsedInline.durationText);

        jobs.push({
          label: cleanLabel,
          durationText: parsedInline.durationText,
          startIdx: sIdx,
          endIdx: eIdx,
          months: monthsInclusive(sIdx, eIdx),
        });
        continue;
      }

      const next = lines[i + 1] || "";
      const parsedNext = parseDateRange(next);
      if (parsedNext) {
        const sIdx = monthIndex(parsedNext.sy, parsedNext.sm);
        const eIdx = monthIndex(parsedNext.ey, parsedNext.em);

        jobs.push({
          label: lastHeader.replace(/\s+/g, " ").trim(),
          durationText: parsedNext.durationText,
          startIdx: sIdx,
          endIdx: eIdx,
          months: monthsInclusive(sIdx, eIdx),
        });
      }

      continue;
    }

    if (/^duration\s*:/i.test(line) && lastHeader) {
      const parsed = parseDateRange(line);
      if (!parsed) continue;

      const sIdx = monthIndex(parsed.sy, parsed.sm);
      const eIdx = monthIndex(parsed.ey, parsed.em);

      jobs.push({
        label: lastHeader.replace(/\s+/g, " ").trim(),
        durationText: parsed.durationText,
        startIdx: sIdx,
        endIdx: eIdx,
        months: monthsInclusive(sIdx, eIdx),
      });
    }
  }

  return jobs;
}

type Interval = { startIdx: number; endIdx: number };

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.startIdx - b.startIdx);

  const merged: Interval[] = [];
  let cur = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    const canMerge = MERGE_ADJACENT ? next.startIdx <= cur.endIdx + 1 : next.startIdx <= cur.endIdx;

    if (canMerge) {
      cur.endIdx = Math.max(cur.endIdx, next.endIdx);
    } else {
      merged.push(cur);
      cur = { ...next };
    }
  }

  merged.push(cur);
  return merged;
}

function verifyResumeDeterministic(resumeRaw: string) {
  const resume = sanitizeText(resumeRaw ?? "");

  if (!resume || resume.length < 50) {
    return {
      totalExperience: "0 years 0 months",
      summary: "Resume text missing/too short.",
    };
  }

  const experienceText = sliceProfessionalExperience(resume);
  const jobs = extractJobs(experienceText);

  if (jobs.length === 0) {
    return {
      totalExperience: "0 years 0 months",
      summary:
        `Verification Scan (Jan 2026):\n` +
        `- Mathematical Audit Result: No job durations found.\n` +
        `Fix format to include lines like:\n` +
        `  "Client: X || Duration: Nov 2024 - Till Date"\n` +
        `  "Client: Y || Duration: Sep 2023 - Oct 2024"\n`,
    };
  }

  const grossMonths = jobs.reduce((sum, j) => sum + j.months, 0);
  const intervals: Interval[] = jobs.map((j) => ({ startIdx: j.startIdx, endIdx: j.endIdx }));
  const merged = mergeIntervals(intervals);
  const netMonths = merged.reduce((sum, it) => sum + monthsInclusive(it.startIdx, it.endIdx), 0);

  const lines: string[] = [];
  lines.push(`Verification Scan (Jan 2026):`);
  lines.push(`- Mathematical Audit Result:`);

  jobs.forEach((j, idx) => {
    lines.push(`  ${idx + 1}. ${j.label} || Duration: ${j.durationText} = ${j.months} months`);
  });

  lines.push(
    `- Total Calculation (gross): ${jobs.map((j) => `${j.months}`).join(" + ")} = ${grossMonths} months (${formatYearsMonths(
      grossMonths
    )})`
  );

  const hadMerge = merged.length !== intervals.length;
  if (!hadMerge) lines.push(`- Interval Consolidation: no overlaps detected.`);
  else lines.push(`- Interval Consolidation: merged ${intervals.length} intervals into ${merged.length}.`);

  lines.push(`- Total Net Experience: ${netMonths} months (${formatYearsMonths(netMonths)}).`);

  return {
    totalExperience: formatYearsMonths(netMonths),
    summary: lines.join("\n"),
  };
}

// ============================================================================
// 5) GET: SPEECHMATICS TOKEN (KEEP WORKING)
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
// 6) POST
// ============================================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, resume, jd, userEmail, duration, mode, question, answer } = body;

    // MODE A: VERIFY RESUME
    if (mode === "verify_resume") {
      const result = verifyResumeDeterministic(resume);

      await logUsageAndIncrement(userEmail || "Unknown", "Resume-Verify", {
        mode: "verify_resume",
        transcript: "",
        duration: duration || 0,
      });

      return NextResponse.json({
        totalExperience: result.totalExperience,
        summary: result.summary,
      });
    }

    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return NextResponse.json({
        score: 0,
        strengths: [],
        improvements: ["Missing API Key"],
        resume_proof: "N/A",
      });
    }

    // ✅ NEW MODE: RESUME-BASED SCRIPT ONLY
    if (mode === "generate_script") {
      const safeResume = sanitizeText(resume);
      const safeJd = sanitizeText(jd);
      const safeQ = sanitizeText(question);
      const safeA = sanitizeText(answer);

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content:
                  `You're helping someone practice their interview. Write a natural, conversational answer - like you're actually talking, not reading from a script.\n\n` +
                  `RULES:\n` +
                  `- Return ONLY this JSON: {"betterAnswerExample":"...","resume_proof":"..."}\n` +
                  `- The answer should be 3-5 sentences max, SHORT and SPECIFIC\n` +
                  `- Use REAL facts from the resume (company names, equipment, techniques)\n` +
                  `- Sound like a real person talking - natural, confident, not robotic\n` +
                  `- NO corporate speak: "I'd be happy", "let me walk you through", "as per my resume"\n` +
                  `- Start directly: "Yeah so...", "Absolutely...", "So for that..."\n` +
                  `- NO lengthy theory - give short, practical answers with real examples\n` +
                  `- resume_proof: quote the specific resume detail you used (brief). If none available: "Resume didn't specify this detail"\n`,
              },
              {
                role: "user",
                content:
                  `RESUME:\n${safeResume}\n\n` +
                  `JOB DESCRIPTION:\n${safeJd || "N/A"}\n\n` +
                  `QUESTION:\n${safeQ}\n\n` +
                  `THEIR ANSWER (might be short/incomplete):\n${safeA}\n\n` +
                  `Give a SHORT, SPECIFIC answer using real details from resume. No long theory.`,
              },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
            max_tokens: 300,
          }),
        });

        const data = await response.json();
        const out = JSON.parse(cleanJson(data.choices?.[0]?.message?.content || "{}"));

        await logUsageAndIncrement(userEmail || "Unknown", "Groq-Script", {
          mode: "generate_script",
          transcript: safeQ,
          duration: duration || 0,
        });

        return NextResponse.json({
          betterAnswerExample: out?.betterAnswerExample || "",
          resume_proof: out?.resume_proof || "",
        });
      } catch {
        return NextResponse.json({
          betterAnswerExample: "",
          resume_proof: "",
        });
      }
    }

    // MODE B: FEEDBACK
    if (mode === "generate_feedback") {
      const safeResume = sanitizeText(resume);
      const safeJd = sanitizeText(jd);
      const safeQ = sanitizeText(question);
      const safeA = sanitizeText(answer);

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content:
                  `You're a practical interview coach. Give feedback like you're helping a friend prep - honest but supportive.\n\n` +
                  `Return ONLY this JSON: {"score":0-10,"strengths":[...],"improvements":[...],"betterAnswerExample":"...","resume_proof":"..."}\n\n` +
                  `RULES:\n` +
                  `- Score 0-10 based on clarity, confidence, and relevance\n` +
                  `- strengths: What worked in their answer (2-3 specific things)\n` +
                  `- improvements: Action steps with exact wording tips (be specific, not generic)\n` +
                  `- betterAnswerExample: Write SHORT (3-5 sentences), using REAL resume facts\n` +
                  `  * Start conversationally: "Yeah so...", "Absolutely...", "So for that..."\n` +
                  `  * NO corporate speak: "I'd be happy", "let me walk you through"\n` +
                  `  * Use their REAL resume facts (company names, equipment, techniques)\n` +
                  `  * NO lengthy theory - keep it practical and brief\n` +
                  `- resume_proof: Note which resume details you used\n`,
              },
              {
                role: "user",
                content:
                  `RESUME:\n${safeResume}\n\n` +
                  `JOB DESCRIPTION:\n${safeJd || "N/A"}\n\n` +
                  `QUESTION:\n${safeQ}\n\n` +
                  `THEIR ANSWER:\n${safeA}\n\n` +
                  `Give practical coaching with SHORT, SPECIFIC better answer.`,
              },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
            max_tokens: 400,
          }),
        });

        const data = await response.json();
        return NextResponse.json(JSON.parse(cleanJson(data.choices?.[0]?.message?.content)));
      } catch {
        return NextResponse.json({ score: 0, strengths: [], improvements: ["Error"], betterAnswerExample: "N/A" });
      }
    }

    // MODE C: QUESTIONS
    if (mode === "generate_questions") {
      const safeResume = sanitizeText(resume);
      const safeJd = sanitizeText(jd);

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                `Generate realistic interview questions. Return STRICT JSON ONLY:\n` +
                `{"questions":["q1","q2","q3","q4","q5","q6","q7","q8, ","q9","q10","q11","q12","q13","q14","q15","q16","q17","q18","q19","q20","q21","q22","q23","q24","q25","q26","q27","q28","q29","q30","q31","q32","q33","q34","q35","q36","q37","q38","q39","q40","q41","q42","q43","q44","q45","q46","q47","q48","q49","q50"]}\n\n` +
                `RULES:\n` +
                `- Exactly 50 questions (strings only, no numbering inside)\n` +
                `- Mix technical, behavioral, and situational questions\n` +
                `- DO NOT include "Tell me about yourself" (frontend forces it)\n` +
                `- Base questions on their resume and job description\n`,
            },
            { role: "user", content: `RESUME:\n${safeResume}\n\nJOB DESCRIPTION:\n${safeJd || "N/A"}` },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(cleanJson(raw));

      const questions = Array.isArray(parsed?.questions)
        ? parsed.questions.map((x: any) => String(x || "").trim()).filter(Boolean)
        : [];

      return NextResponse.json({ questions });
    }

    // ========================================================================
    // MODE D: REAL-TIME INTERVIEW (SHORT, SPECIFIC, REAL EXAMPLES)
    // ========================================================================
    await logUsageAndIncrement(userEmail, "Groq-RealTime", { transcript, duration });

    const lowerQ = (transcript || "").toLowerCase().trim();
    const wordCount = (transcript || "").split(/\s+/).length;

    // Detect simple greetings and small talk (handle combined like "Hi, how are you?")
    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)[\.,]?\s*$/i.test(lowerQ);
    const isSmallTalk = /how are you|how's it going|how you doing|what's up|wassup|sup/i.test(lowerQ) && wordCount <= 6;
    const isGreetingPlusSmallTalk = /^(hi|hello|hey)[\s,]+.*(how are you|how's it going|how you doing)/i.test(lowerQ);
    
    // Detect question types
    const logisticalKeywords = [
      "relocate", "relocation", "start date", "joining date", "how soon", 
      "notice period", "salary", "compensation", "ctc", "pay",
      "travel", "willing to travel", "visa", "sponsorship", "citizenship", 
      "work authorization", "hybrid", "remote", "onsite"
    ];

    const behavioralKeywords = [
      "challenge", "conflict", "difficult", "weakness", "strength", 
      "describe a time", "tell me about a time", "mistake", "failure", 
      "troubleshoot", "problem", "issue", "error",
      "team", "pressure", "deadline", "manage", "leadership", 
      "greatest achievement", "proudest", "goal", "future", "5 years"
    ];

    // Introduction/Company pitch detection
    const isIntroduction = /tell (me|us) about yourself|introduce yourself|walk (me|us) through your (background|resume|experience)/i.test(transcript);
    const isCompanyPitch = /(about|regarding|concerning) (ecolab|the company|our company|this company|us|our organization)/i.test(transcript) 
                          || /day to day|daily (duties|responsibilities)|what (you|you'll) (do|be doing)/i.test(transcript)
                          || wordCount > 80; // Long company descriptions

    const isLogistical = logisticalKeywords.some(kw => lowerQ.includes(kw));
    const isBehavioral = behavioralKeywords.some(kw => lowerQ.includes(kw));

    let systemInstruction = "";

    if (isGreeting && !isSmallTalk && !isGreetingPlusSmallTalk) {
      // ---> SIMPLE GREETING ONLY
      systemInstruction = `The interviewer just said a simple greeting like "Hello" or "Hi" with nothing else.

YOUR RESPONSE (ONE WORD):
Just greet them back.

"Hello" → "Hi"
"Hi" → "Hello"

DO NOT add anything else. Just the greeting.`;

    } else if (isSmallTalk || isGreetingPlusSmallTalk) {
      // ---> SMALL TALK (Professional Interview Setting)
      systemInstruction = `This is a PROFESSIONAL JOB INTERVIEW. The interviewer is making polite small talk.

YOUR RESPONSE (ONE SHORT PROFESSIONAL SENTENCE):
Be polite and professional. Keep it brief and professional.

Examples:
"How are you?" → "I'm doing well, thank you. How are you?"
"Hi, how are you?" → "Hi! I'm doing well, thank you. How are you?"
"How's it going?" → "Very well, thank you."

CRITICAL RULES:
- Keep it PROFESSIONAL (this is an interview, not meeting a friend)
- DO NOT mention personal life (trips, family, weekend plans)
- DO NOT mention job titles or company names yet
- DO NOT mention anything from your resume
- Just polite acknowledgment, then turn it back to them or stay quiet

Remember: Professional, brief, courteous. This is an interview setting.`;

    } else if (isCompanyPitch || wordCount > 80) {
      // ---> COMPANY INTRO / LONG PITCH RESPONSE
      systemInstruction = `The interviewer just gave you a long introduction. They're NOT asking a question yet.

YOUR RESPONSE (10-15 WORDS MAX):
- Just acknowledge briefly
- Show interest
- That's it - stop talking

Examples:
"That's great. I'm really excited about the work you're doing here."
"Sounds perfect. I'm looking forward to contributing to the team."
"That's awesome. Really aligns with what I'm looking for."

DO NOT start explaining your background. Just acknowledge.`;

    } else if (isIntroduction) {
      // ---> "TELL ME ABOUT YOURSELF" RESPONSE
      systemInstruction = `They asked you to introduce yourself.

YOUR RESPONSE (20-30 SECONDS, 4-6 SENTENCES):
1. One sentence: Current role/status
2. Two sentences: What you actually do (specific tasks from resume)
3. One sentence: Recent achievement (use REAL detail from resume)
4. One sentence: Why you want this job

CRITICAL:
- Use ACTUAL facts from the resume (company names OK here, techniques, numbers)
- NO generic statements like "I have extensive experience"
- Start: "Yeah, so..." or "So right now..."
- Keep it conversational, like meeting someone at a conference`;

    } else if (isLogistical) {
      // ---> HR/LOGISTICAL QUESTIONS (SUPER SHORT)
      systemInstruction = `Simple HR question.

YOUR RESPONSE: 1 SENTENCE ONLY
Be direct. No explanation needed.

Examples:
"Can you relocate?" → "Yeah, I'm open to relocating."
"Notice period?" → "I can start immediately."
"Salary?" → "I'm looking for around 70-75K."`;

    } else if (isBehavioral) {
      // ---> BEHAVIORAL/STORY QUESTIONS (SHORT + SPECIFIC)
      systemInstruction = `They want a real example from your experience.

YOUR RESPONSE (3-5 SENTENCES MAX, 20-30 SECONDS):
1. One sentence: What the situation was (use REAL example from resume - PRIORITIZE CURRENT/MOST RECENT JOB)
2. Two sentences: What you specifically did (mention actual techniques/tools)
3. One sentence: Quick result

CRITICAL RULES:
- **PRIORITIZE examples from CURRENT or MOST RECENT job** (the one with "Present" or latest dates)
- Use REAL details from the resume (specific equipment, techniques, companies)
- NO theory or textbook explanations
- NO long stories - keep it tight
- If resume doesn't have exact example, use the closest real experience from CURRENT role first
- Start: "Yeah, so..." or "So there was this time..."

Example (Troubleshooting - prioritize current role):
"Yeah, so at AVA we had this issue with HPLC data integrity during an FDA inspection. I immediately pulled the electronic audit trails, validated the backup systems, and worked with IT to demonstrate 21 CFR Part 11 compliance. We passed the inspection with zero findings."

Example (Challenge - prioritize current role):
"So when I started at AVA as QC Lab Supervisor, we had really tight timelines for batch release. I streamlined the COA review process, trained the team on electronic data review, and we cut our release time by 30%."

**REMEMBER: Use CURRENT job examples first. Only go to previous jobs if current role doesn't have relevant experience. Keep it SHORT + SPECIFIC + REAL.**`;

    } else {
      // ---> TECHNICAL QUESTIONS (ADAPTIVE LENGTH)
      systemInstruction = `Answer based on what they're actually asking.

STEP 1: ANALYZE THE QUESTION
- Is it simple/direct? (e.g., "Do you know HPLC?") → 1-2 sentences
- Is it asking for process? (e.g., "How do you troubleshoot?") → 3-4 sentences  
- Is it complex/multi-part? → 4-6 sentences

STEP 2: ANSWER FORMAT
Short questions (1-2 sentences):
- Direct answer with one real example
- "Yeah, I work with that regularly. Used it for stability testing at [Company]."

Medium questions (3-4 sentences):
- Quick process (2 sentences)
- Real example (1-2 sentences)
- "So I usually start with checking calibration and controls. Then verify the method parameters. Like when we had failing OOS results, turned out to be a reagent issue."

CRITICAL RULES:
- Use REAL details from resume (equipment names, company context, actual numbers)
- NO theory paragraphs - keep it practical
- Start naturally: "Yeah, so..." or "Absolutely..." or "So for that..."
- Match answer length to question complexity
- NO company names UNLESS giving specific example
- If unsure, keep it SHORT - don't ramble

REMEMBER: Be conversational, specific, and brief. Think "coffee chat with colleague" not "textbook answer".`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: systemInstruction,
          },
          { 
            role: "user", 
            content: `RESUME (use REAL facts from here):\n${sanitizeText(resume)}\n\nINTERVIEWER: "${transcript}"\n\nGive a natural, SHORT answer using real details from the resume. Don't make up generic theory.`
          },
        ],
        temperature: 0.3, // ✅ Lower for more consistent, faster responses
        max_tokens: 200, // ✅ REDUCED for speed (was 300)
      }),
    });

    const data = await response.json();
    let aiAns = data.choices?.[0]?.message?.content || "...";
    
    // Clean up AI artifacts
    aiAns = aiAns
      .replace(/^(Based on the resume|As the candidate|I see that|According to the|The resume mentions|Looking at your resume|From my background|As mentioned in|My background|As per)/i, "")
      .replace(/^(I have extensive experience|I primarily use|With my experience|In my experience)/i, "")
      .replace(/^(Thank you for|Thanks for the|I appreciate)/i, "")
      .trim();

    return NextResponse.json({ answer: aiAns });
  } catch (error: any) {
    console.error("API Error", error);
    return NextResponse.json({ score: 0 });
  }
}