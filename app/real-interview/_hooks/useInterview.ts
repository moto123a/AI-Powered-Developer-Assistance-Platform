// app/real-interview/_hooks/useInterview.ts

import { useState, useRef, useCallback, useEffect } from "react";
import { SpeechmaticsClient }  from "../_lib/stt-client";
import { buildMessages }       from "../_lib/promptBuilder";
import { cleanAnswer, formatForReading } from "../_lib/formatAnswer";
import {
  isGreeting, isSmallTalk, isGreetingPlusSmallTalk,
  isNoisyGreeting, isCompanyPitch,
  getGreetingResponse, getSmallTalkResponse,
  extractAndLockFacts, clearSessionState,
} from "../_lib/promptBuilder";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type Turn = { role: "interviewer" | "candidate"; text: string };

// ─────────────────────────────────────────────
// SANITIZE RESUME
// ─────────────────────────────────────────────
function sanitizeResume(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "•")
    .replace(/\u00A0/g, " ")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E\n\r\t•]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────
export function useInterview(config: {
  resume:          string;
  jobDescription:  string;
  companyName:     string;
  role:            string;
  userEmail:       string;
  model?:          string;
  maxDelay?:       number;
  operatingPoint?: "enhanced" | "standard";
  language?:       string;
}) {
  const [isRecording,  setIsRecording]  = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript,   setTranscript]   = useState("");
  const [partial,      setPartial]      = useState("");
  const [answer,       setAnswer]       = useState("");
  const [history,      setHistory]      = useState<Turn[]>([]);
  const [sessionSecs,  setSessionSecs]  = useState(0);
  const [micStatus,    setMicStatus]    = useState("Ready");

  const sttClient       = useRef<SpeechmaticsClient | null>(null);
  const transcriptRef   = useRef("");
  const partialRef      = useRef("");
  const historyRef      = useRef<Turn[]>([]);
  const timerRef        = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef    = useRef<number>(0);
  const isGeneratingRef = useRef(false); // Race-condition guard

  // Keep historyRef in sync
  useEffect(() => { historyRef.current = history; }, [history]);

  // ── SESSION TIMER ──
  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now() - sessionSecs * 1000;
      timerRef.current = setInterval(() => {
        setSessionSecs(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // ── GENERATE ANSWER ──
  const generateAnswer = useCallback(async () => {
    const fullText = (transcriptRef.current + " " + partialRef.current).trim();
    if (!fullText || isGeneratingRef.current) return;

    // Stop mic first
    if (sttClient.current) {
      sttClient.current.stop();
      sttClient.current = null;
    }
    setIsRecording(false);

    // ── ZERO-LATENCY LOCAL REPLIES ──
    // Handle greetings and noise instantly without API call
    if (isGreeting(fullText) || isNoisyGreeting(fullText)) {
      const reply = getGreetingResponse();
      setAnswer(reply);
      extractAndLockFacts(fullText, reply);
      const nextHistory: Turn[] = [
        ...historyRef.current,
        { role: "interviewer", text: fullText },
        { role: "candidate",   text: reply    },
      ];
      setHistory(nextHistory);
      historyRef.current = nextHistory;
      return;
    }

    if (isSmallTalk(fullText) || isGreetingPlusSmallTalk(fullText)) {
      const reply = getSmallTalkResponse();
      setAnswer(reply);
      extractAndLockFacts(fullText, reply);
      const nextHistory: Turn[] = [
        ...historyRef.current,
        { role: "interviewer", text: fullText },
        { role: "candidate",   text: reply    },
      ];
      setHistory(nextHistory);
      historyRef.current = nextHistory;
      return;
    }

    if (isCompanyPitch(fullText)) {
      const reply = "That sounds like a really exciting challenge — I've been following what you're building and I have a lot of thoughts on how I can contribute.";
      setAnswer(reply);
      extractAndLockFacts(fullText, reply);
      const nextHistory: Turn[] = [
        ...historyRef.current,
        { role: "interviewer", text: fullText },
        { role: "candidate",   text: reply    },
      ];
      setHistory(nextHistory);
      historyRef.current = nextHistory;
      return;
    }

    // ── NORMAL AI ANSWER ──
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setAnswer("");

    // Add interviewer turn to history
    const nextHistory: Turn[] = [
      ...historyRef.current,
      { role: "interviewer", text: fullText },
    ];
    setHistory(nextHistory);
    historyRef.current = nextHistory;

    // Clean resume before sending
    const cleanResume = sanitizeResume(config.resume);
    const cleanJd     = sanitizeResume(config.jobDescription);

    try {
      const messages = buildMessages(
        cleanResume,
        fullText,
        historyRef.current.slice(0, -1)
      );

      const res = await fetch("/api/stt/tokens", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          transcript: fullText,
          resume:     cleanResume,
          jd:         cleanJd,
          userEmail:  config.userEmail,
          model:      config.model || "llama-3.1-8b",
          context:    `Role: ${config.role} | Company: ${config.companyName}`,
        }),
        signal: AbortSignal.timeout(35000),
      });

      const data = await res.json();

      if (res.status === 402 || data.error === "insufficient_credits") {
        setAnswer("⚠️ You've used all your credits. Please upgrade your plan.");
        setIsGenerating(false);
        return;
      }

      const cleaned = formatForReading(cleanAnswer(data?.answer || "No response."));
      setAnswer(cleaned);

      // Lock facts from this Q&A so conflict detection works on next question
      extractAndLockFacts(fullText, cleaned);

      const withAnswer: Turn[] = [
        ...historyRef.current,
        { role: "candidate", text: cleaned },
      ];
      setHistory(withAnswer);
      historyRef.current = withAnswer;

    } catch (err) {
      console.error("Answer generation error:", err);
      setAnswer("Error generating answer. Please try again.");
    }

    isGeneratingRef.current = false;
    setIsGenerating(false);
  }, [config]);

  // ── START MIC ──
  const startMic = useCallback(() => {
    setIsRecording(true);
    setTranscript("");
    setPartial("");
    setAnswer("");
    transcriptRef.current = "";
    partialRef.current    = "";

    sttClient.current = new SpeechmaticsClient();
    sttClient.current.start({
      maxDelay:       config.maxDelay       ?? 0.3,
      operatingPoint: config.operatingPoint || "enhanced",
      onStatus:  (s) => setMicStatus(s),
      onPartial: (text) => {
        partialRef.current = text;
        setPartial(text);
      },
      onFinal: (text) => {
        const clean = text.trim();
        if (!clean) return;
        const current = transcriptRef.current.trim();
        if (current.endsWith(clean)) {
          setPartial(""); partialRef.current = ""; return;
        }
        const next = current ? `${current} ${clean}` : clean;
        setTranscript(next);
        transcriptRef.current = next;
        setPartial(""); partialRef.current = "";
      },
      onError: () => {
        setIsRecording(false);
        setMicStatus("Mic error");
        if (sttClient.current) {
          sttClient.current.stop();
          sttClient.current = null;
        }
      },
    });
  }, [config.language, config.maxDelay, config.operatingPoint]);

  // ── STOP MIC ──
  const stopMic = useCallback(() => {
    if (sttClient.current) {
      sttClient.current.stop();
      sttClient.current = null;
    }
    setIsRecording(false);
  }, []);

  // ── TOGGLE ──
  const toggleMic = useCallback(() => {
    if (isRecording) stopMic();
    else startMic();
  }, [isRecording, startMic, stopMic]);

  // ── CLEAR ──
  const clear = useCallback(() => {
    setTranscript(""); setPartial(""); setAnswer("");
    transcriptRef.current = ""; partialRef.current = "";
  }, []);

  // ── RESET SESSION ──
  const resetSession = useCallback(() => {
    stopMic();
    setHistory([]); historyRef.current = [];
    setSessionSecs(0);
    clearSessionState(); // clear locked facts for fresh session
    clear();
  }, [stopMic, clear]);

  // ── SPACEBAR ──
  const handleSpacebar = useCallback((e: KeyboardEvent) => {
    if (e.code !== "Space") return;
    if (e.target instanceof HTMLInputElement)  return;
    if (e.target instanceof HTMLTextAreaElement) return;
    e.preventDefault();
    if (isRecording) generateAnswer();
    else startMic();
  }, [isRecording, generateAnswer, startMic]);

  return {
    isRecording, isGenerating,
    transcript, partial,
    answer, history,
    sessionSecs, micStatus,
    toggleMic, startMic, stopMic,
    generateAnswer, clear, resetSession,
    handleSpacebar,
  };
}