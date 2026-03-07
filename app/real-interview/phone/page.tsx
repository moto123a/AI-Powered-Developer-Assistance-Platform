"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SpeechmaticsClient } from "../laptop/stt-client";
import {
  Mic,
  MicOff,
  ArrowLeft,
  FileText,
  Clipboard,
  Check,
  RefreshCw,
  Zap,
  Sparkles,
  BrainCircuit,
  ShieldAlert,
  Loader2,
  Search,
} from "lucide-react";
import { auth } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import AuthModal from "../../../components/AuthModal";

export default function MobilePhonePage() {
  // --- EXISTING PROTECTION STATE ---
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [view, setView] = useState<"setup" | "interview">("setup");
  const [resume, setResume] = useState("");
  const [resumeSource, setResumeSource] = useState<"paste" | "upload">("paste");
  const [fileName, setFileName] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  // --- RESUME VERIFICATION ---
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState("");

  const testResumeReading = async () => {
    if (!resume || resume.length < 50) {
      alert("Please paste your resume first.");
      return;
    }

    setIsVerifying(true);
    setVerificationResult("");

    try {
      const res = await fetch("/api/stt/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "verify_resume",
          resume: resume,
          jd: "General Interview",
        }),
      });

      // IMPORTANT: read as text first so we can display HTML / non-JSON errors
      const rawText = await res.text();

      // If response isn't OK, show real status + body snippet
      if (!res.ok) {
        const snippet = rawText?.slice(0, 1200) || "";
        setVerificationResult(
          `Verify failed (HTTP ${res.status} ${res.statusText}). Server said:\n\n${snippet}`
        );
        setIsVerifying(false);
        return;
      }

      // Try JSON parse; if it fails, show raw
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (e) {
        setVerificationResult(
          `Verify returned non-JSON response (still OK HTTP). Raw:\n\n${rawText?.slice(0, 1200) || ""}`
        );
        setIsVerifying(false);
        return;
      }

      // Support multiple server shapes:
      // 1) { summary: "..." }
      // 2) { totalExperience: "X years Y months" }
      // 3) anything else -> show as JSON
      if (data?.summary && typeof data.summary === "string") {
        setVerificationResult(data.summary);
      } else if (data?.totalExperience) {
        setVerificationResult(`Total Experience: ${data.totalExperience}`);
      } else {
        setVerificationResult(`Verify response:\n\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (e: any) {
      // Only real network/CORS/runtime errors should land here
      setVerificationResult(`Connection/runtime error: ${e?.message || String(e)}`);
    }

    setIsVerifying(false);
  };

  // --- EXISTING DATA STATES ---
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [finalAnswer, setFinalAnswer] = useState("");
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "interviewer" | "candidate"; text: string }>
  >([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const hiddenDraftRef = useRef("");
  const [copied, setCopied] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);

  const sttClient = useRef<any>(null);
  const transcriptRef = useRef("");
  const partialRef = useRef("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) setShowAuthModal(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setThinkingStep((prev) => (prev + 1) % 4);
    }, 1200);
    return () => clearInterval(interval);
  }, [isRecording]);

  const getThinkingText = () => {
    switch (thinkingStep) {
      case 0:
        return "Listening to Interviewer...";
      case 1:
        return "Analyzing Roles & Achievements...";
      case 2:
        return "Scripting Professional Response...";
      case 3:
        return "Ready to Speak...";
      default:
        return "Processing...";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      setResume(text);
    } catch (err) {
      setResume("File upload failed. Please paste text.");
    }
  };

  const performFetch = async () => {
    const fullText = (transcriptRef.current + " " + partialRef.current).trim();
    if (!fullText || fullText.length < 5) return;
    const previewHistory = [...conversationHistory, { role: "interviewer" as const, text: fullText }];
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    try {
      const response = await fetch("/api/stt/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: fullText,
          resume: resume,
          conversationHistory: previewHistory,
          userEmail: auth.currentUser?.email || "unknown",
          duration: duration,
        }),
      });
      const data = await response.json();
      if (data.answer) {
        hiddenDraftRef.current = data.answer;
      }
    } catch (err) {
      console.error("Fetch error", err);
    }
  };

  useEffect(() => {
    if (!isRecording) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (partialRef.current.length > 5 || transcriptRef.current.length > 5) {
        performFetch();
      }
    }, 2000);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [partial, transcript, isRecording]);

  // ✅ FIXED: Proper mic pause/resume behavior
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // ========================================
      // STOPPING RECORDING - MIC GOES OFF
      // ========================================
      
      // 1. IMMEDIATELY stop and destroy the Speechmatics client
      if (sttClient.current) {
        sttClient.current.stop();
        sttClient.current = null; // Complete cleanup
      }
      
      // 2. Update UI state
      setIsRecording(false);
      
      // 3. Calculate duration
      const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      const fullText = (transcriptRef.current + " " + partialRef.current).trim();
      const finalHistory = fullText
        ? [...conversationHistory, { role: "interviewer" as const, text: fullText }]
        : [...conversationHistory];
      
      // 4. Show draft answer immediately if available
      if (hiddenDraftRef.current) {
        setFinalAnswer(hiddenDraftRef.current);
      }
      
      // 5. Get final answer from backend (only if we have text)
      if (fullText && fullText.length > 3) {
        try {
          const response = await fetch("/api/stt/tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transcript: fullText,
              resume: resume,
              conversationHistory: finalHistory,
              userEmail: auth.currentUser?.email || "unknown",
              duration: duration,
            }),
          });
          const data = await response.json();
          if (data.answer) {
            setFinalAnswer(data.answer);
            setConversationHistory([...finalHistory, { role: "candidate", text: data.answer }]);
          } else {
            setConversationHistory(finalHistory);
          }
        } catch (e) {
          console.error("API error:", e);
          setConversationHistory(finalHistory);
        }
      }
      
      // ✅ MIC IS NOW OFF - User must manually press button to restart
      
    } else {
      // ========================================
      // STARTING NEW RECORDING - MIC GOES ON
      // ========================================
      
      // 1. Reset all states for fresh session
      setIsRecording(true);
      setStartTime(Date.now());
      setTranscript("");
      setPartial("");
      setFinalAnswer("");
      hiddenDraftRef.current = "";
      transcriptRef.current = "";
      partialRef.current = "";
      
      // 2. Create brand new Speechmatics client
      sttClient.current = new SpeechmaticsClient();
      sttClient.current.start({
        language: "en",
        onStatus: () => {},
        onPartial: (text: string) => {
          // Show partial text in real-time
          setPartial(text);
          partialRef.current = text;
        },
        onFinal: (text: string) => {
          // ✅ FIX DUPLICATION: Only add new text, don't repeat partial
          const cleanText = text.trim();
          if (!cleanText) return;
          
          // Check if this text is already at the end of transcript (prevents duplication)
          const currentTranscript = transcriptRef.current.trim();
          if (currentTranscript.endsWith(cleanText)) {
            // Already have this text, skip
            setPartial("");
            partialRef.current = "";
            return;
          }
          
          // Add new text with single space separator
          const newTotal = currentTranscript 
            ? `${currentTranscript} ${cleanText}` 
            : cleanText;
          
          setTranscript(newTotal);
          transcriptRef.current = newTotal;
          setPartial("");
          partialRef.current = "";
        },
        onError: () => {
          // On error, fully stop recording
          setIsRecording(false);
          if (sttClient.current) {
            sttClient.current.stop();
            sttClient.current = null;
          }
        },
      });
    }
  }, [isRecording, resume, startTime, conversationHistory]);

  // ✅ SPACE KEY CONTROL - Must be AFTER toggleRecording is defined
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only work in interview view, and don't trigger if typing in input
      if (view !== "interview") return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault(); // Prevent page scroll
        toggleRecording();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [view, toggleRecording]);

  const copyAnswer = () => {
    navigator.clipboard.writeText(finalAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 safe-area-inset font-sans">
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {!user ? (
        <div className="flex flex-col items-center justify-center h-screen p-10 text-center">
          <BrainCircuit size={60} className="text-slate-700 mb-4" />
          <h2 className="text-2xl font-bold text-slate-400">Access Restricted</h2>
          <button
            onClick={() => setShowAuthModal(true)}
            className="mt-6 px-8 py-3 bg-blue-600 rounded-xl font-bold"
          >
            Sign In Now
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === "setup" ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="min-h-screen p-5 pb-10"
            >
              <div className="max-w-2xl mx-auto">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-10 mt-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/30">
                    <Mic size={36} className="text-white" />
                  </div>
                  <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Interview Copilot
                  </h1>
                  <p className="text-slate-400 text-lg font-medium">Professional First-Person Candidate Scripting</p>
                </motion.div>

                <motion.div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-6 mb-6 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold flex items-center gap-3">
                      <FileText size={20} className="text-blue-400" /> Resume / CV
                    </h2>
                    <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
                      <button
                        onClick={() => setResumeSource("paste")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          resumeSource === "paste"
                            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                            : "text-slate-400"
                        }`}
                      >
                        Paste
                      </button>
                      <button
                        onClick={() => setResumeSource("upload")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          resumeSource === "upload"
                            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                            : "text-slate-400"
                        }`}
                      >
                        Upload
                      </button>
                    </div>
                  </div>

                  {resumeSource === "paste" ? (
                    <div className="relative">
                      <textarea
                        value={resume}
                        onChange={(e) => setResume(e.target.value)}
                        placeholder="Paste your resume content here..."
                        className="w-full min-h-[250px] bg-slate-900/50 border border-slate-700 rounded-2xl p-5 text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none text-base resize-none"
                      />
                    </div>
                  ) : (
                    <motion.div
                      onClick={() => fileInputRef.current?.click()}
                      whileTap={{ scale: 0.98 }}
                      className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/30 min-h-[250px] flex flex-col items-center justify-center"
                    >
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                      <FileText size={56} className="mx-auto mb-4 text-slate-500" />
                      <p className="text-slate-300 font-semibold mb-2">{fileName || "Upload Your Resume (.txt)"}</p>
                    </motion.div>
                  )}

                  {/* --- VERIFICATION BUTTON --- */}
                  {resume.length > 50 && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <button
                        onClick={testResumeReading}
                        disabled={isVerifying}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold transition-all"
                      >
                        {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        {isVerifying ? "Analyzing Full Resume Details..." : "Verify AI Reads My Full History"}
                      </button>
                      {verificationResult && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-3 p-4 bg-emerald-950/30 border border-emerald-500/20 rounded-xl"
                        >
                          <p className="text-xs font-bold text-emerald-400 uppercase mb-1">Extracted Profile Confirmation:</p>
                          <pre className="text-xs text-emerald-100/80 leading-relaxed whitespace-pre-wrap break-words">
                            {verificationResult}
                          </pre>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>

                <motion.button
                  onClick={() => {
                    if (!resume) return;
                    setConversationHistory([]);
                    setView("interview");
                  }}
                  disabled={!resume}
                  whileTap={{ scale: 0.97 }}
                  className={`w-full py-6 rounded-2xl font-bold text-xl transition-all shadow-2xl ${
                    resume
                      ? "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white"
                      : "bg-slate-800 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {resume ? "🚀 Start Interview Session" : "📋 Add Resume to Continue"}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="interview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col h-screen bg-gradient-to-b from-[#0a0a0f] to-[#050508]"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-4 pt-6 bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 shrink-0">
                <button
                  onClick={() => setView("setup")}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div
                  className={`px-5 py-2.5 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 ${
                    isRecording ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isRecording && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                  {isRecording ? "LIVE" : "READY"}
                </div>
                <button
                  onClick={() => {
                    setTranscript("");
                    setFinalAnswer("");
                    hiddenDraftRef.current = "";
                    setConversationHistory([]);
                  }}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl"
                >
                  <RefreshCw size={20} />
                </button>
              </div>

              <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                {/* Question Area */}
                <div className="h-[25%] bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50 overflow-y-auto shadow-xl shrink-0">
                  <div className="flex items-center gap-2 mb-4 sticky top-0 bg-transparent">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                    <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Interviewer is asking:</span>
                  </div>
                  <div className="text-lg leading-relaxed text-slate-100 font-medium">
                    {transcript || <span className="text-slate-600 italic">Waiting for audio...</span>}
                    {partial && <span className="text-blue-400 animate-pulse"> {partial}</span>}
                  </div>
                </div>

                {/* Answer Area */}
                <div
                  className={`flex-1 flex flex-col backdrop-blur-sm rounded-3xl border shadow-xl transition-colors duration-500 overflow-hidden ${
                    isRecording
                      ? "bg-blue-900/10 border-blue-500/30"
                      : "bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-purple-500/30"
                  }`}
                >
                  <div className="p-5 pb-2 flex items-center justify-between shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      {isRecording ? (
                        <BrainCircuit size={14} className="animate-pulse text-blue-400" />
                      ) : (
                        <Sparkles size={14} className="text-purple-400" />
                      )}
                      <span className={`text-xs font-bold uppercase tracking-wider ${isRecording ? "text-blue-400" : "text-purple-400"}`}>
                        {isRecording ? "AI Extracting Career Details..." : "Professional First-Person Script"}
                      </span>
                    </div>
                    {finalAnswer && !isRecording && (
                      <button
                        onClick={copyAnswer}
                        className="text-xs px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-2 font-semibold backdrop-blur-md transition-all"
                      >
                        {copied ? <Check size={14} /> : <Clipboard size={14} />} {copied ? "Copied" : "Copy Script"}
                      </button>
                    )}
                  </div>

                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 pt-2">
                    <div className="min-h-full font-medium leading-relaxed text-lg">
                      {isRecording ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                          <div className="relative w-16 h-16 flex items-center justify-center">
                            <motion.div
                              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                              transition={{ repeat: Infinity, duration: 2.5 }}
                              className="absolute inset-0 bg-blue-500/20 rounded-full"
                            />
                            <BrainCircuit size={32} className="text-blue-400 z-10" />
                          </div>
                          <motion.div
                            key={thinkingStep}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-blue-300 font-mono text-sm tracking-wide bg-blue-900/30 px-3 py-1 rounded-full border border-blue-500/20"
                          >
                            {getThinkingText()}
                          </motion.div>
                        </div>
                      ) : (
                        <div className="text-white animate-in fade-in duration-200">
                          {finalAnswer || (
                            <div className="flex flex-col items-center justify-center h-full opacity-60 space-y-2">
                              <Sparkles className="animate-spin text-purple-400" size={24} />
                              <span className="text-purple-300 italic text-sm">Reviewing your full history to answer...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 bg-slate-900/50 backdrop-blur-xl border-t border-slate-800 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={toggleRecording}
                  className={`w-full rounded-2xl font-bold h-28 transition-all shadow-2xl flex flex-col items-center justify-center relative overflow-hidden ${
                    isRecording
                      ? "bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/40"
                      : "bg-gradient-to-br from-blue-600 to-purple-600 shadow-blue-500/40"
                  }`}
                >
                  {isRecording && (
                    <motion.div
                      animate={{ scale: [1, 1.3], opacity: [0.2, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-white/20 rounded-2xl"
                    />
                  )}
                  {isRecording ? (
                    <>
                      <MicOff size={32} className="text-white mb-1 relative z-10" />
                      <span className="text-sm font-bold tracking-wide text-white relative z-10">STOP & GENERATE SCRIPT</span>
                      <span className="text-[10px] text-red-100 mt-1 relative z-10 opacity-90 flex items-center gap-1 font-mono uppercase">
                        <ShieldAlert size={10} fill="currentColor" /> Press SPACE to Stop
                      </span>
                    </>
                  ) : (
                    <>
                      <Mic size={36} className="text-white mb-2" />
                      <span className="text-sm font-bold tracking-wide text-white">TAP TO LISTEN INTERVIEWER</span>
                      <span className="text-[10px] text-white/70 mt-1 font-mono">or press SPACE</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
