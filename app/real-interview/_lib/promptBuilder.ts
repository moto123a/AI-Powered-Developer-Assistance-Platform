// app/real-interview/_lib/promptBuilder.ts
// Matches C# PromptBuilder.cs exactly — strongest version

export type Turn = { role: "interviewer" | "candidate"; text: string };

// ─────────────────────────────────────────────
// GREETING DETECTION — zero-latency local reply
// ─────────────────────────────────────────────
export function isGreeting(q: string): boolean {
  const t = q.trim().toLowerCase().replace(/[.,!?]+$/, "");
  return [
    "hi", "hello", "hey", "hi there", "good morning",
    "good afternoon", "good evening", "greetings", "hey there",
  ].includes(t);
}

export function isSmallTalk(q: string): boolean {
  const t = q.toLowerCase();
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  return (
    wordCount <= 6 &&
    (
      t.includes("how are you")       || t.includes("how's it going") ||
      t.includes("how you doing")     || t.includes("how have you been") ||
      t.includes("nice to meet")      || t.includes("thanks for coming") ||
      t.includes("pleasure to meet")
    )
  );
}

export function isGreetingPlusSmallTalk(q: string): boolean {
  const t = q.toLowerCase();
  return /^(hi|hello|hey)[\s,]+.*(how are you|how's it going|how you doing)/i.test(t);
}

// Short noisy transcript — background TV, random words
// If ≤4 words AND contains hi/hello/hey → treat as greeting
export function isNoisyGreeting(q: string): boolean {
  const t     = q.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  return words.length <= 4 && /\bhi\b|\bhello\b|\bhey\b/i.test(t);
}

// Long interviewer intro — company pitch, day-to-day description
export function isCompanyPitch(q: string): boolean {
  const t         = q.toLowerCase();
  const wordCount = q.split(/\s+/).filter(Boolean).length;
  return (
    wordCount > 80 ||
    /(about|regarding) (the company|our company|this company|us|our organization)/i.test(q) ||
    /day to day|daily (duties|responsibilities)|what (you|you'll) (do|be doing)/i.test(q)
  );
}

export function getGreetingResponse(): string {
  return "Hey, great to be here — really looking forward to this conversation!";
}

export function getSmallTalkResponse(): string {
  return "Doing really well, thanks! Excited to be here and learn more about the role.";
}

// ─────────────────────────────────────────────
// QUESTION TYPE DETECTION
// ─────────────────────────────────────────────
type QuestionType =
  | "yesno"
  | "intro"
  | "technical"
  | "behavioral"
  | "situational"
  | "weakness"
  | "whyrole"
  | "salary"
  | "availability"
  | "followup"
  | "general";

export function detectType(q: string): QuestionType {
  const t = q.toLowerCase().trim();

  // Follow-up
  if (
    t.includes("tell me more")      || t.includes("can you elaborate") ||
    t.includes("expand on that")    || t.includes("go deeper")         ||
    t.includes("elaborate on")      || t.includes("go on")             ||
    t.includes("continue")
  ) return "followup";

  // Yes/No
  if (
    /^(are you|do you|can you|will you|have you|is your|would you|did you|are u|r u)/.test(t)
  ) return "yesno";

  if (
    t.includes("stem opt")          || t.includes("work authorization") ||
    t.includes("sponsorship")       || t.includes("relocat")            ||
    t.includes("visa")              || t.includes("authorized to work") ||
    t.includes("willing to")        || t.includes("background check")   ||
    t.includes("drug test")         || t.includes("citizen")            ||
    t.includes("green card")        || t.includes("overtime")           ||
    t.includes("hybrid")            || t.includes("on-site")            ||
    t.includes("onsite")
  ) return "yesno";

  // Salary
  if (
    t.includes("salary")            || t.includes("compensation")       ||
    t.includes("pay expectation")   || t.includes("how much")           ||
    t.includes("package")           || t.includes("ctc")
  ) return "salary";

  // Availability
  if (
    t.includes("start date")        || t.includes("when can you start") ||
    t.includes("notice period")     || t.includes("available to join")  ||
    t.includes("earliest start")    || t.includes("join us")
  ) return "availability";

  // Intro
  if (
    t.includes("tell me about yourself") || t.includes("walk me through") ||
    t.includes("introduce yourself")     || t.includes("tell us about you") ||
    (t.includes("background") && t.includes("yourself"))
  ) return "intro";

  // Behavioral
  if (
    t.includes("tell me a time")         || t.includes("tell me about a time") ||
    t.includes("give me an example")     || t.includes("describe a situation")  ||
    t.includes("walk me through a time") || t.includes("share an example")      ||
    t.includes("have you ever faced")    || t.includes("when did you")
  ) return "behavioral";

  // Weakness
  if (
    t.includes("weakness")               || t.includes("biggest failure")      ||
    t.includes("made a mistake")         || t.includes("area of improvement")  ||
    t.includes("constructive feedback")  || t.includes("weaknesses")
  ) return "weakness";

  // Why role
  if (
    (t.includes("why") && (
      t.includes("role")     || t.includes("company") ||
      t.includes("this job") || t.includes("us")      ||
      t.includes("here")     || t.includes("position")
    )) ||
    t.includes("what interest you")   || t.includes("what attracted")  ||
    t.includes("what excites you")    || t.includes("what motivates")  ||
    t.includes("why should we hire")  || t.includes("strengths")       ||
    t.includes("what makes you")
  ) return "whyrole";

  // Situational
  if (
    t.includes("what would you do")    || t.includes("how would you handle") ||
    t.includes("if you were")          || t.includes("hypothetically")       ||
    t.includes("imagine you")          || t.includes("scenario where")
  ) return "situational";

  // Technical
  if (
    t.includes("what is")               || t.includes("explain")               ||
    t.includes("how does")              || t.includes("describe how")           ||
    t.includes("what are")              || t.includes("difference between")     ||
    t.includes("how do you")            || t.includes("what do you know about") ||
    t.includes("define")                || t.includes("compare")                ||
    t.includes("architecture")          || t.includes("implement")
  ) return "technical";

  return "general";
}

// ─────────────────────────────────────────────
// DRILL-DOWN DETECTION
// ─────────────────────────────────────────────
export function isDrillDown(q: string, history: Turn[]): boolean {
  if (history.length === 0) return false;
  const t = q.toLowerCase().trim();

  if (/^how (many|long|much|often|far|soon|old)/.test(t))           return true;
  if (/^which (version|one|tool|language|framework|company|team|project|platform|stack|cloud|database|year|month|role|position)/.test(t)) return true;
  if (/^what (version|year|company|team|tool|language|framework|platform|size|number|percentage|metric|result|outcome|role|project)/.test(t)) return true;
  if (/^who (said|was|were|is|told|mentioned|managed|led)/.test(t))  return true;
  if (/^when (was|did|were|is|did you)/.test(t))                     return true;
  if (/^where (was|did|were|is)/.test(t))                            return true;
  if (/^(you said|you mentioned|you told|you talked about|u said|u mentioned|you just said)/.test(t)) return true;
  if (/^(what did you mean|what do you mean by|can you clarify|clarify that)/.test(t))                return true;
  if (/(years? of|year experience|how many years|years? experience)/.test(t))                        return true;

  // Short ≤6 words with reference word
  const words = t.split(" ").filter(Boolean);
  if (words.length <= 6) {
    const refWords = [
      "how","which","what","who","when","where",
      "years","version","size","team","number",
      "much","many","long","old","big","use","used",
    ];
    if (refWords.some(w => t.includes(w))) return true;
  }

  return false;
}

// ─────────────────────────────────────────────
// FORMAT REMINDER
// ─────────────────────────────────────────────
export function buildFormatReminder(
  type:      QuestionType,
  q:         string,
  drillDown: boolean
): string {
  if (drillDown)
    return "[FORMAT: MICRO — 1-2 sentences ONLY. NO bullets. Look at conversation history, pull the EXACT fact asked about. Answer ONLY that specific thing. Do NOT re-explain. Do NOT add background.]";

  const t = q.toLowerCase();

  switch (type) {
    case "yesno":
      if (t.includes("stem opt") || t.includes("visa") || t.includes("sponsorship") || t.includes("authorized"))
        return "[FORMAT: MICRO — 2-3 sentences. NO bullets. Confirm STEM OPT, 2+ years remaining, H-1B transfer intent, BNSF top target. Confident and factual.]";
      if (t.includes("relocat"))
        return "[FORMAT: MICRO — 1-2 sentences. NO bullets. Yes + Chicago base + open to destination.]";
      if (t.includes("remote") || t.includes("hybrid") || t.includes("on-site") || t.includes("onsite"))
        return "[FORMAT: MICRO — 1-2 sentences. NO bullets. State flexibility clearly.]";
      if (t.includes("travel"))
        return "[FORMAT: MICRO — 1-2 sentences. NO bullets. Yes + comfortable with stated %.]";
      if (t.includes("background") || t.includes("drug"))
        return "[FORMAT: MICRO — 1 sentence. NO bullets. Confident yes.]";
      if (t.includes("overtime") || t.includes("weekend"))
        return "[FORMAT: MICRO — 1-2 sentences. NO bullets. Confirm flexibility.]";
      return "[FORMAT: MICRO — 1-3 sentences. NO bullets. Direct answer + one supporting fact. Confident.]";

    case "intro":
      return "[FORMAT: FULL — 5-6 bullets using • only. START with current role at Renasant Bank. NEVER start with education or Wipro. Structure: WHO YOU ARE NOW → KEY WIN at Renasant → Wipro briefly → MS in 1 sentence → side projects → why this specific company. Each bullet 1-2 sentences. No filler opener.]";

    case "technical":
      return "[FORMAT: FULL — 4-5 bullets using • only. Bullet 1 = clean 1-sentence definition. Bullet 2 = Renasant Bank experience FIRST with tool + outcome. Bullet 3 = Wipro as supporting example. Practitioner tone, not textbook.]";

    case "behavioral":
      return "[FORMAT: FULL — 4-5 bullets using • only. STAR: Situation (brief) → Action (detailed) → Result (numbers). Lead with Renasant Bank if relevant. Company, tool, team size, outcome.]";

    case "weakness":
      return "[FORMAT: FULL — 3-4 bullets using • only. Real weakness → concrete steps taken → evidence of improvement. Not a fake strength. Self-aware.]";

    case "whyrole":
      return "[FORMAT: FULL — 3-4 bullets using • only. Specific to company tech + career direction. For BNSF: hybrid cloud, open-source stack, freight scale. No generic answers.]";

    case "salary":
      return "[FORMAT: MEDIUM — 2-3 bullets using • only. Range $130k-$160k senior infra. Total comp flexible. Anchored to market.]";

    case "availability":
      return "[FORMAT: MICRO — 1-2 sentences. NO bullets. Notice period or availability date directly and confidently.]";

    case "situational":
      return "[FORMAT: FULL — 3-4 bullets using • only. Anchor in real past situation from resume first, then apply to scenario. Grounded not theoretical.]";

    case "followup":
      return "[FORMAT: MEDIUM — 2-3 bullets using • only. NEW detail ONLY. Never repeat what was already said. Go deeper — new layer, new number, new angle.]";

    default:
      return "[FORMAT: FULL — 4-5 bullets using • only. Renasant Bank examples first. Specific companies, tools, numbers from resume. No filler opener. Sound human and spoken.]";
  }
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT — identical to C# version
// ─────────────────────────────────────────────
export function buildSystemPrompt(resume: string): string {
  return `
You ARE the candidate in a live job interview. You are a real professional, not an AI.
The resume below is YOUR life — YOUR jobs, YOUR wins, YOUR skills, YOUR growth.
Always speak in first person. Be sharp, confident, and completely human.
You are mid-conversation with a hiring manager right now.

════════════════════════════════════════════════════
YOUR RESUME — USE ONLY THESE REAL FACTS. NEVER INVENT:
════════════════════════════════════════════════════
${resume}

════════════════════════════════════════════════════
RULE #1 — MOST CRITICAL: READ HISTORY, ANSWER EXACTLY WHAT WAS ASKED
════════════════════════════════════════════════════

BEFORE every answer, do this check:
  STEP 1: Read the current question.
  STEP 2: Read the full conversation history.
  STEP 3: Is this question referencing something ALREADY SAID in a previous answer?
  STEP 4: Pick the mode:

  ╔══════════════════════════════════════════════════════╗
  ║ Referencing previous answer → MICRO MODE            ║
  ║ 1-2 sentences. Direct fact only. NO bullets.        ║
  ╠══════════════════════════════════════════════════════╣
  ║ Going deeper on one specific topic → MEDIUM MODE    ║
  ║ 2-3 bullets. New detail only. Never repeat.         ║
  ╠══════════════════════════════════════════════════════╣
  ║ Brand new topic → FULL MODE                         ║
  ║ 4-5 bullets. Real examples. Numbers. Companies.     ║
  ╚══════════════════════════════════════════════════════╝

REAL EXAMPLES:
  History had: "...3.5 years of experience..."
  Q: "How many years?" or "You said how many?"
  CORRECT: "3.5 years total — about 2.5 at Wipro and just over a year at Renasant Bank."
  WRONG: bullets, re-explaining career history.

  History had: "...Java Spring Boot at Wipro..."
  Q: "Which version of Java?"
  CORRECT: "Java 11 and 17 — 17 for newer services at Renasant, 11 at Wipro."
  WRONG: explaining what Java is or its history.

  History had: "...team of 6 engineers..."
  Q: "How big was the team?"
  CORRECT: "6 engineers — 3 backend, 2 infra, 1 QA."
  WRONG: anything more than 1-2 sentences.

  History had: "...reduced setup time by 40%..."
  Q: "How did you achieve that 40%?"
  CORRECT: 2-3 bullets going DEEPER — the specific steps, tools, what changed.
  WRONG: re-telling the full story from scratch.

════════════════════════════════════════════════════
RULE #2 — GREETING / SMALL TALK / NOISE
════════════════════════════════════════════════════
If the question is ONLY a greeting (hi, hello, hey, good morning):
  → Reply with ONE sentence only: "Hey, great to be here!"
  → NO bullets. NO career info. NO background. Just the greeting.

If background noise or short random words (≤4 words, no clear question):
  → Reply with ONE sentence: "Sorry, could you repeat that?"
  → Do NOT give a full answer to noise.

If interviewer says "how are you" or small talk:
  → ONE professional sentence only.
  → "Doing well, thanks — excited to be here!"

════════════════════════════════════════════════════
RULE #3 — CURRENT JOB ALWAYS FIRST
════════════════════════════════════════════════════
CURRENT:  Renasant Bank — Full Stack Infrastructure Engineer (Jan 2025 - Present)
PREVIOUS: Wipro Limited — Software Engineer (Jun 2021 - Sep 2023)

ALWAYS mention Renasant Bank FIRST. NEVER lead with Wipro.
CORRECT: "At Renasant Bank I currently... and before that at Wipro I..."
WRONG:   "At Wipro I... and then at Renasant..."

════════════════════════════════════════════════════
RULE #4 — TELL ME ABOUT YOURSELF — EXACT STRUCTURE
════════════════════════════════════════════════════
NEVER start with "I studied" or "I graduated" — WEAK.
START with WHO YOU ARE RIGHT NOW.

  • WHO YOU ARE NOW: current role at Renasant Bank + what you do
  • KEY WIN at Renasant: one specific achievement with metric
  • Wipro: briefly (2.5 years, what you built, tools used)
  • MS at Roosevelt: 1 sentence only
  • Side projects: CoopilotX AI, freight pipeline
  • Why THIS company: specific tech/challenge at this company

════════════════════════════════════════════════════
RULE #5 — THREE ANSWER FORMATS
════════════════════════════════════════════════════
MICRO  → 1-2 sentences, NO bullets.
         For: drill-downs, yes/no, greetings, availability, noise.

MEDIUM → 2-3 bullets using •.
         For: follow-ups going deeper on one topic.

FULL   → 4-5 bullets using •.
         For: all new topics not yet in conversation.
         Format:
           • [Direct answer — hit it immediately, no wind-up]
           • [Real example — Renasant Bank + tool + metric + outcome]
           • [Second example — Wipro or project, different angle]
           • [Insight or lesson from real experience]
           • [Tie to this role — only if genuinely strong]

Each bullet = 1-2 sentences MAX. Short. Punchy. Spoken.
Leave ONE blank line between each bullet.
Use ONLY • for bullets. Never - or * or numbers.

════════════════════════════════════════════════════
RULE #6 — BANNED OPENERS
════════════════════════════════════════════════════
NEVER start with:
"Great question!" / "Good question!" / "Absolutely!" / "Of course!"
"Sure!" / "Definitely!" / "That's a great point!" / "Certainly!"
"Happy to answer!" / "That's interesting!"

START directly with the answer or:
"Yeah so..." / "Honestly..." / "So..." / Direct fact.

════════════════════════════════════════════════════
RULE #7 — SOUND HUMAN
════════════════════════════════════════════════════
Always use contractions: I'm, I've, didn't, wasn't, it's, that's, we'd.
BANNED words: robust, comprehensive, spearheaded, streamlined,
leverage, synergy, utilize, delve, passionate about, results-driven,
innovative, cutting-edge, best-in-class, dynamic, proactive, holistic.

════════════════════════════════════════════════════
RULE #8 — BE SPECIFIC ALWAYS
════════════════════════════════════════════════════
Name company. Name tool. Give number. State outcome.
BAD:  "I worked on cloud infra and improved things."
GOOD: "At Renasant Bank — Terraform on AWS, cut setup time by 40%."

════════════════════════════════════════════════════
RULE #9 — SESSION MEMORY
════════════════════════════════════════════════════
NEVER repeat same company or example already used this session.
Topic covered → go DEEPER or use DIFFERENT example.
If interviewer references something you said → pick it up naturally:
  "Right yeah — to go deeper on that..."
  "That connects to what I mentioned about Renasant..."

════════════════════════════════════════════════════
INTELLIGENCE RULES
════════════════════════════════════════════════════
1.  READ HISTORY FIRST — every single time.
2.  ANSWER WHAT WAS ASKED — not what you assume.
3.  CURRENT JOB FIRST — Renasant Bank before Wipro always.
4.  INTRO = WHO YOU ARE NOW — never start with education.
5.  SPECIFIC: company name, tool, number, outcome every time.
6.  QUANTIFY: "40% faster", "team of 6", "99.99% uptime".
7.  SHOW DON'T TELL: never "I'm good at X" — show what you did.
8.  CONTRACTIONS: always. I'm, I've, didn't, wasn't.
9.  NO REPETITION: same example used → use different one.
10. TIGHT: FULL = 4-5 bullets max. Done = stop. Don't pad.
11. ONLY RESUME FACTS: never invent company, skill, or project.
12. VARY OPENERS per bullet:
    "At Renasant..." / "At Wipro..." / "For example..."
    "One thing I ran into..." / "What I found was..."
    "The result was..." / "That taught me..." / "Honestly..."

════════════════════════════════════════════════════
PERMANENTLY BANNED
════════════════════════════════════════════════════
- Any filler opener (Great question!, Absolutely!, etc.)
- Starting intro with education or "I studied"
- Mentioning Wipro before Renasant Bank
- Re-explaining when asked a drill-down
- Inventing experience not in resume
- Repeating same company or example twice in session
- Paragraphs when bullets are required
- Bullets when MICRO mode is required
`.trim();
}

// ─────────────────────────────────────────────
// BUILD MESSAGES — main entry point
// Sends full conversation history every call
// so model has complete per-session memory
// ─────────────────────────────────────────────
export function buildMessages(
  resume:          string,
  currentQuestion: string,
  history:         Turn[]
): Array<{ role: string; content: string }> {

  const q = currentQuestion.trim();

  // ── Zero-latency local overrides ──
  // Greeting → don't even call API, return instantly
  // (handled in useInterview.ts before calling this)

  const type      = detectType(q);
  const drillDown = isDrillDown(q, history);
  const reminder  = buildFormatReminder(type, q, drillDown);

  const messages: Array<{ role: string; content: string }> = [];

  // 1. System prompt with resume
  messages.push({
    role:    "system",
    content: buildSystemPrompt(resume),
  });

  // 2. Full conversation history = per-session memory
  //    Every Q&A injected as alternating turns
  //    Model sees entire session and chains naturally
  for (const turn of history) {
    messages.push({
      role:    turn.role === "interviewer" ? "user" : "assistant",
      content: turn.text,
    });
  }

  // 3. History hint — primes model to check last answer
  const lastAnswer = history
    .filter(t => t.role === "candidate")
    .slice(-1)[0]?.text ?? "";

  const historyHint = lastAnswer
    ? `[YOUR LAST ANSWER WAS:\n${lastAnswer.slice(0, 400)}${lastAnswer.length > 400 ? "..." : ""}\nCHECK: is the current question asking about a specific fact from that answer? If YES → MICRO MODE (1-2 sentences, pull exact fact, NO bullets, nothing extra). If NO → use format reminder below.]\n\n`
    : "";

  // 4. Greeting/noise override hint
  const greetingHint =
    isGreeting(q) || isNoisyGreeting(q)
      ? "[THIS IS A GREETING OR SHORT NOISE. Reply with ONE sentence only. No career info. No bullets. Just a warm natural reply like 'Hey, great to be here!']\n\n"
      : isSmallTalk(q) || isGreetingPlusSmallTalk(q)
      ? "[THIS IS SMALL TALK. Reply with ONE sentence only. Professional and warm. No career info.]\n\n"
      : isCompanyPitch(q)
      ? "[INTERVIEWER GAVE A LONG INTRO. Acknowledge in 10-15 words max. Show interest. Do NOT explain your background yet.]\n\n"
      : "";

  // 5. Current question + hints + format reminder
  messages.push({
    role:    "user",
    content: `${greetingHint}${historyHint}${q}\n\n${reminder}`,
  });

  return messages;
}