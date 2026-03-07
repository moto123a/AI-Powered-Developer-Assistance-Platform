"use client";

import { useEffect, useRef, useState } from "react";
import AiRobot3D from "../../components/AiRobot3D";

// --- Types ---
type Feedback = {
  score: number;
  strengths: any[];
  improvements: any[];
  betterAnswerExample: any;
  resume_proof?: any;
};

type InterviewTurn = {
  role: "interviewer" | "candidate";
  text: string;
};

// --- Render Safe Helper ---
const renderSafe = (val: any) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (typeof (val as any).summary === "string") return (val as any).summary;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
};

// --- API Helper ---
async function fetchAi(payload: any) {
  const url = "/api/stt/tokens";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Non-JSON response from API:", text);
    throw new Error("API returned non-JSON response");
  }
}

// --- FILE HELPER ---
const handleFileUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (s: string) => void
) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    setter(text);
  } catch {
    alert("File read error");
  }
};

// --- STRICT ANSWER RULES ---
const isTooShortAnswer = (text: string) => {
  const t = (text || "").trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (t.length < 20) return true;
  if (words.length < 5) return true;
  return false;
};

// --- QUESTION NORMALIZER ---
const normalizeQuestions = (res: any): string[] => {
  const q1 = res?.questions;
  const q2 = res?.data?.questions;
  const q3 = res?.result?.questions;

  const raw = Array.isArray(q1) ? q1 : Array.isArray(q2) ? q2 : Array.isArray(q3) ? q3 : [];
  const cleaned = raw
    .map((x: any) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);

  return cleaned;
};

const normalizeSingleQuestion = (res: any): string => {
  const q1 = res?.question;
  const q2 = res?.data?.question;
  const q3 = res?.result?.question;
  const raw = [q1, q2, q3].find((x) => typeof x === "string") || "";
  const clean = String(raw || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.endsWith("?") ? clean : `${clean}?`;
};

// --- SHUFFLE ---
const shuffle = (arr: string[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ✅ Always force first question
const enforceFirstTellMe = (qs: string[]) => {
  const first = "Tell me about yourself.";
  const filtered = (qs || [])
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .filter((q) => q.toLowerCase() !== first.toLowerCase());
  return [first, ...filtered];
};

export default function MockInterviewPage() {
  // --- STT SETTINGS ---
  const [sttEngine, setSttEngine] = useState<"webkit" | "speechmatics">("webkit");

  // --- Data ---
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>("");

  // --- Interview ---
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [answer, setAnswer] = useState("");

  const [micOn, setMicOn] = useState(false);
  const [interim, setInterim] = useState("");
  const [answerLocked, setAnswerLocked] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  const [lastFeedback, setLastFeedback] = useState<Feedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingNextQuestion, setIsLoadingNextQuestion] = useState(false);

  const [sessionId, setSessionId] = useState<string>("");
  const [scores, setScores] = useState<number[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<InterviewTurn[]>([]);

  // --- Pre-Start Camera Prompt ---
  const [showPreStart, setShowPreStart] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  // --- Refs ---
  const recognitionRef = useRef<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const smSessionStartedRef = useRef(false); 
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Logic Refs
  const shouldAutoListenRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const autoNextArmedRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeQuestions =
    generatedQuestions.length > 0 ? generatedQuestions : ["Tell me about yourself."];
  const currentQuestion =
    started && index < activeQuestions.length ? activeQuestions[index] : "Finished.";

  // --- LOGGER ---
  const addLog = (msg: string) => {
    setLogs((prev) => {
      if (prev[0] === msg) return prev;
      return [msg, ...prev].slice(0, 3);
    });
  };

  // --- VERIFY RESUME FUNCTION ---
  const testResumeReading = async () => {
    if (!resumeText || resumeText.length < 50) {
      alert("Please paste a valid resume first.");
      return;
    }
    setIsVerifying(true);
    setVerificationResult("");
    try {
      const data = await fetchAi({
        mode: "verify_resume",
        resume: resumeText,
        jd: jdText || "N/A",
      });

      if (data?.summary) setVerificationResult(data.summary);
      else setVerificationResult(data || "AI didn't return a summary.");
    } catch {
      setVerificationResult("Connection failed. Check API Key.");
    }
    setIsVerifying(false);
  };

  // --- UTILS ---
  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // --- CAMERA ---
  const startCamera = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  // --- MIC ---
  const stopMic = () => {
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    smSessionStartedRef.current = false;
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ message: "EndOfStream" }));
      }
      socketRef.current.close();
      socketRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaRecorderRef.current = null;
    }

    setMicOn(false);
    setIsUserSpeaking(false);
    clearSilenceTimer();
  };

  const startMic = async () => {
    if (typeof window === "undefined") return;
    if (isSpeaking || isAnalyzing || micOn) return;

    stopMic();

    // --- CHOICE: WEB-KIT ---
    if (sttEngine === "webkit") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => { setMicOn(true); addLog("🎤 Mic ON (Webkit)"); };
      rec.onend = () => {
        setMicOn(false);
        if (shouldAutoListenRef.current && !isSpeaking && !autoNextArmedRef.current && !answerLocked) {
          restartTimeoutRef.current = setTimeout(() => {
            if (shouldAutoListenRef.current) try { rec.start(); } catch { addLog("Restart prevented"); }
          }, 1000);
        }
      };

      rec.onresult = (event: any) => {
        if (isSpeaking) { stopMic(); return; }
        let iText = ""; let fText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) fText += t + " ";
          else iText += t;
        }
        if (iText || fText) { setIsUserSpeaking(true); clearSilenceTimer(); armSilenceTimer(); }
        if (fText) setAnswer((prev) => (prev + " " + fText.trim()).trim());
        setInterim(iText);
      };

      rec.onerror = (e: any) => {
        if (e.error === "no-speech") return;
        addLog(`Mic Error: ${e.error}`);
        if (e.error === "not-allowed") shouldAutoListenRef.current = false;
      };

      recognitionRef.current = rec;
      try { rec.start(); } catch {}
    } 
    // --- CHOICE: SPEECHMATICS ---
    else if (sttEngine === "speechmatics") {
      try {
        const resToken = await fetch("/api/stt/tokens?email=user@example.com");
        const { token } = await resToken.json();
        if (!token) throw new Error("No token");

        const ws = new WebSocket(`wss://eu2.rt.speechmatics.com/v2/en?jwt=${token}`);
        ws.binaryType = "arraybuffer";
        socketRef.current = ws;

        ws.onopen = () => {
          addLog("Connecting to Speechmatics...");
          ws.send(JSON.stringify({
            message: "StartRecognition",
            audio_format: { type: "file" },
            transcription_config: { 
              language: "en", 
              operating_point: "enhanced", 
              enable_partials: true 
            }
          }));
        };

        ws.onmessage = async (e) => {
          if (typeof e.data !== "string") return;
          const data = JSON.parse(e.data);

          if (data.message === "RecognitionStarted") {
            smSessionStartedRef.current = true;
            setMicOn(true);
            addLog("🎤 Mic ON (Speechmatics)");
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = async (event) => {
              if (event.data.size > 0 && ws.readyState === WebSocket.OPEN && smSessionStartedRef.current) {
                const buffer = await event.data.arrayBuffer();
                ws.send(buffer);
              }
            };
            mediaRecorder.start(200); 
            return;
          }

          if (data.message === "Error") {
            addLog(`SM Error: ${data.reason}`);
            return;
          }

          if (data.message === "AddTranscript") {
            const text = data.metadata.transcript;
            if (text) {
              setAnswer((prev) => (prev + " " + text).trim());
              setIsUserSpeaking(true);
              armSilenceTimer();
            }
          } else if (data.message === "AddPartialTranscript") {
            const part = data.metadata.transcript;
            setInterim(part);
            if (part) { setIsUserSpeaking(true); armSilenceTimer(); }
          }
        };

        ws.onerror = (err) => { console.error(err); addLog("Speechmatics Connection Error"); };
        ws.onclose = () => { setMicOn(false); smSessionStartedRef.current = false; };

      } catch (err) {
        console.error(err);
        addLog("Speechmatics failed to start");
      }
    }
  };

  // --- SUBMISSION ---
  const armSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      if (autoNextArmedRef.current) return;
      const ans = (answer || "").trim();
      if (ans.length < 5) return;
      addLog("⏳ Processing Answer...");
      handleSubmit(ans);
    }, 2500);
  };

  const handleSubmit = async (finalAnswer: string) => {
    const cleanAns = (finalAnswer || "").trim();
    const cleanQuestion = (activeQuestions[index] || "").trim();
    const nextHistory: InterviewTurn[] = [...conversationHistory];

    if (
      cleanQuestion &&
      !(nextHistory[nextHistory.length - 1]?.role === "interviewer" &&
        nextHistory[nextHistory.length - 1]?.text === cleanQuestion)
    ) {
      nextHistory.push({ role: "interviewer", text: cleanQuestion });
    }
    if (cleanAns) {
      nextHistory.push({ role: "candidate", text: cleanAns });
    }
    setConversationHistory(nextHistory);

    if (isTooShortAnswer(cleanAns)) {
      autoNextArmedRef.current = true;
      shouldAutoListenRef.current = false;
      stopMic();
      setAnswerLocked(true);
      setInterim("");
      setIsAnalyzing(true);

      try {
        const scriptRes = await fetchAi({
          mode: "generate_script",
          question: activeQuestions[index],
          answer: cleanAns,
          resume: resumeText,
          jd: jdText,
          conversationHistory: nextHistory,
        });

        const fb: Feedback = {
          score: 0,
          strengths: [],
          improvements: ["Answer is too short. Speak at least 2–3 full sentences with details from your resume."],
          betterAnswerExample: scriptRes?.betterAnswerExample || "Speak longer. Add: role + years + skills.",
          resume_proof: scriptRes?.resume_proof || "",
        };

        setLastFeedback(fb);
        setScores((p) => [...p, fb.score || 0]);
        setIsAnalyzing(false);
        setShowFeedback(true);
        return;
      } catch {
        setIsAnalyzing(false);
        return;
      }
    }

    autoNextArmedRef.current = true;
    shouldAutoListenRef.current = false;
    stopMic();
    setAnswerLocked(true);
    setInterim("");
    setIsAnalyzing(true);

    try {
      const res = await fetchAi({
        mode: "generate_feedback",
        question: activeQuestions[index],
        answer: cleanAns,
        resume: resumeText,
        jd: jdText,
        conversationHistory: nextHistory,
      });
      setLastFeedback(res);
      setScores((p) => [...p, res.score || 0]);
    } catch {
      setLastFeedback({ score: 0, strengths: [], improvements: ["Error"], betterAnswerExample: "N/A" });
    }
    setIsAnalyzing(false);
    setShowFeedback(true);
  };

  const nextQuestion = async () => {
    if (isLoadingNextQuestion) return;
    setIsLoadingNextQuestion(true);
    setShowFeedback(false);
    const nextIndex = index + 1;

    if (nextIndex >= activeQuestions.length) {
      setStarted(false);
      setIsLoadingNextQuestion(false);
      return;
    }

    try {
      const followupRes = await fetchAi({
        mode: "generate_followup_question",
        resume: resumeText,
        jd: jdText,
        conversationHistory,
      });
      const followupQuestion = normalizeSingleQuestion(followupRes);

      if (followupQuestion) {
        setGeneratedQuestions((prev) => {
          const source = prev.length > 0 ? [...prev] : [...activeQuestions];
          source[nextIndex] = followupQuestion;
          return source;
        });
      }
    } catch {
      addLog("Using prepared next question");
    }

    setIndex(nextIndex);
    setAnswer("");
    setAnswerLocked(false);
    autoNextArmedRef.current = false;
    setIsLoadingNextQuestion(false);
  };

  const speakQuestion = () => {
    if (!started) return;
    stopSpeaking();
    shouldAutoListenRef.current = false;
    stopMic();

    setTimeout(() => {
      const utter = new SpeechSynthesisUtterance(currentQuestion);
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => {
        setIsSpeaking(false);
        shouldAutoListenRef.current = true;
        setTimeout(() => startMic(), 1000);
      };
      window.speechSynthesis.speak(utter);
    }, 500);
  };

  useEffect(() => { if (started && index < activeQuestions.length) speakQuestion(); }, [started, index]);

  useEffect(() => { return () => { stopSpeaking(); stopMic(); stopCamera(); }; }, []);

  const initSession = async () => {
    setStarted(true);
    setIndex(0);
    setScores([]);
    setAnswer("");
    setInterim("");
    setLastFeedback(null);
    setShowFeedback(false);
    setAnswerLocked(false);
    autoNextArmedRef.current = false;
    shouldAutoListenRef.current = false;
    setIsAnalyzing(false);
    setIsLoadingNextQuestion(false);
    setConversationHistory([]);
  };

  const confirmStart = async (enableCamera: boolean) => {
    setShowPreStart(false);
    if (enableCamera) await startCamera();
    else stopCamera();
    await initSession();
  };

  const progressLabel = started && activeQuestions.length > 0 ? `${index + 1} / ${activeQuestions.length}` : "";

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Mock Interview</h1>
            {started && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <span className="text-slate-600">Progress:</span>
                <span className="text-slate-300 font-bold">{progressLabel}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!started && (
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 mr-2">
                    <button onClick={() => setSttEngine("webkit")} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${sttEngine === 'webkit' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>WEBKIT</button>
                    <button onClick={() => setSttEngine("speechmatics")} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${sttEngine === 'speechmatics' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>SPEECHMATICS</button>
                </div>
            )}
            {started && (
              <>
                <div className={["px-3 py-1 rounded-full text-[11px] font-bold border", isSpeaking ? "bg-blue-600/20 border-blue-500 text-blue-200" : "bg-slate-950 border-slate-800 text-slate-500"].join(" ")}>{isSpeaking ? "Speaking" : "Listening"}</div>
                <div className={["px-3 py-1 rounded-full text-[11px] font-bold border", micOn ? "bg-emerald-600/20 border-emerald-500 text-emerald-200" : "bg-slate-950 border-slate-800 text-slate-500"].join(" ")}>{micOn ? `Mic On (${sttEngine.toUpperCase()})` : "Mic Off"}</div>
                <button onClick={() => window.location.reload()} className="px-3 py-2 rounded-lg text-xs font-extrabold border border-red-900 text-red-400 hover:bg-red-900/20">End</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {!started && !setupComplete && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Step 1</div>
                  <div className="text-xl font-extrabold">Resume</div>
                </div>
              </div>
              <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} className="w-full h-64 bg-black text-sm p-4 rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none" placeholder="Paste your resume here..."/>
              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="text-xs text-slate-400 cursor-pointer hover:text-blue-400 transition"><input type="file" onChange={(e) => handleFileUpload(e, setResumeText)} className="hidden" accept=".txt,.doc,.docx"/>Upload file</label>
                <button onClick={testResumeReading} disabled={isVerifying || resumeText.length < 50} className="px-3 py-2 rounded-lg text-xs font-extrabold border border-emerald-900 text-emerald-300 hover:bg-emerald-900/20">Test Resume</button>
              </div>
              {verificationResult && <div className="mt-3 p-3 rounded-xl border border-emerald-900 bg-emerald-950/30 text-xs text-emerald-100 whitespace-pre-wrap">{renderSafe(verificationResult)}</div>}
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5">
              <div className="mb-3">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Step 2</div>
                <div className="text-xl font-extrabold">Job Description</div>
              </div>
              <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} className="w-full h-64 bg-black text-sm p-4 rounded-xl border border-slate-800 focus:border-purple-500 focus:outline-none" placeholder="Paste job description here..."/>
              <button onClick={async () => {
                  setIsGenerating(true);
                  try {
                    const res = await fetchAi({ mode: "generate_questions", resume: resumeText, jd: jdText });
                    const qs = normalizeQuestions(res);
                    const finalQs = enforceFirstTellMe(qs.length > 0 ? shuffle(qs) : []);
                    setGeneratedQuestions(finalQs);
                    setSetupComplete(true);
                  } catch { alert("Generation failed."); }
                  setIsGenerating(false);
                }} disabled={isGenerating || !resumeText} className="mt-4 w-full bg-blue-600 hover:bg-blue-500 transition px-6 py-4 rounded-2xl text-sm font-extrabold">{isGenerating ? "Generating…" : "Generate Questions"}</button>
            </div>
          </div>
        )}

        {setupComplete && !started && (
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-10 text-center">
            <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Ready to Start</div>
            <button onClick={() => setShowPreStart(true)} className="mt-6 bg-emerald-600 hover:bg-emerald-500 transition px-10 py-4 rounded-2xl text-lg font-extrabold">Start Interview</button>
          </div>
        )}

        {showPreStart && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur flex items-center justify-center px-4">
            <div className="w-full max-w-lg bg-slate-950 border border-slate-900 rounded-2xl p-6">
              <div className="text-xl font-extrabold">Before we begin</div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => confirmStart(true)} className="bg-blue-600 hover:bg-blue-500 transition px-4 py-3 rounded-xl text-sm font-extrabold">Enable Camera & Start</button>
                <button onClick={() => confirmStart(false)} className="bg-slate-900 hover:bg-slate-800 transition px-4 py-3 rounded-xl text-sm font-extrabold border border-slate-800">Without Camera</button>
              </div>
            </div>
          </div>
        )}

        {started && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden">
              <div className="relative h-80 flex items-center justify-center">
                <AiRobot3D isSpeaking={isSpeaking} />
              </div>
              <div className="p-5 border-t border-slate-900 bg-slate-900/30">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Question {index + 1}</div>
                <div className="mt-2 text-xl font-semibold leading-relaxed">{currentQuestion}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden h-52 bg-black">
                {cameraOn ? <video ref={videoRef} className="w-full h-full object-cover opacity-50" /> : <div className="flex h-full items-center justify-center text-slate-600">Camera Off</div>}
              </div>
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5">
                <div className="mt-3 bg-black border border-slate-900 rounded-xl p-4 min-h-[140px] text-sm whitespace-pre-wrap">
                  {answer?.trim() ? answer : <span className="text-slate-600">Start speaking…</span>}
                  {interim ? <span className="text-slate-500"> {interim}</span> : null}
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => handleSubmit(answer)} disabled={answer.length < 5 || isAnalyzing} className="flex-1 bg-blue-600 transition px-5 py-3 rounded-xl text-sm font-extrabold">{isAnalyzing ? "Analyzing…" : "Submit Answer"}</button>
                  {showFeedback && (
                    <button
                      onClick={nextQuestion}
                      disabled={isLoadingNextQuestion}
                      className="px-5 py-3 rounded-xl text-sm font-extrabold bg-emerald-600 disabled:opacity-50"
                    >
                      {isLoadingNextQuestion ? "Next..." : "Next"}
                    </button>
                  )}
                </div>

                {showFeedback && lastFeedback && (
                  <div className="mt-5 pt-5 border-t border-slate-900 space-y-4">
                    <div className="text-3xl font-extrabold text-emerald-300">{lastFeedback.score ?? 0}/10</div>
                    {lastFeedback.resume_proof && <div className="p-4 rounded-xl border border-blue-900 bg-blue-950/30 text-sm italic">{renderSafe(lastFeedback.resume_proof)}</div>}
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="p-4 rounded-xl border border-slate-900 bg-black text-red-200">{renderSafe(lastFeedback.improvements?.[0] || "—")}</div>
                      <div className="p-4 rounded-xl border border-slate-900 bg-black text-slate-200">{renderSafe(lastFeedback.betterAnswerExample || "—")}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-600 font-mono">{logs.map((l, i) => <div key={i}>{l}</div>)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
