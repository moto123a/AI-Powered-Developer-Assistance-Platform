"use client";

// app/real-interview/_components/SetupForm.tsx

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud, Search, Loader2,
  CheckCircle2, ExternalLink, AlertCircle,
} from "lucide-react";

type Config = {
  resume:         string;
  jobDescription: string;
  companyName:    string;
  role:           string;
};

type Props = {
  onStart:     (config: Config) => void;
  onDashboard: () => void;
  onStealth:   (config: Config) => void;
};

// ─────────────────────────────────────────────
// PDF TEXT EXTRACTOR — uses npm pdfjs-dist
// No CDN, no tracking prevention issues
// ─────────────────────────────────────────────
async function extractPdfText(file: File): Promise<string> {
  try {
    // Dynamic import — only loads when user uploads PDF
    const pdfjsLib = await import("pdfjs-dist");

    // Set worker using local file from node_modules
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf         = await pdfjsLib.getDocument({
      data:              new Uint8Array(arrayBuffer),
      useWorkerFetch:    false,
      isEvalSupported:   false,
      useSystemFonts:    true,
    }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      text += pageText + "\n";
    }

    return text.trim();

  } catch (err) {
    console.error("PDF extraction error:", err);
    throw new Error("Could not read PDF");
  }
}

// ─────────────────────────────────────────────
// CLEAN TEXT
// ─────────────────────────────────────────────
function cleanText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "•")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E\n\r\t•]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
export default function SetupForm({ onStart, onDashboard, onStealth }: Props) {
  const [cfg, setCfg]                   = useState<Config>({
    resume: "", jobDescription: "", companyName: "", role: "",
  });
  const [tab, setTab]                   = useState<"paste" | "upload">("paste");
  const [fileName, setFileName]         = useState("");
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState("");
  const [verifying, setVerifying]       = useState(false);
  const [verified, setVerified]         = useState(false);
  const [verifyResult, setVerifyResult] = useState("");
  const fileRef                         = useRef<HTMLInputElement>(null);

  const update = (key: keyof Config, val: string) => {
    setCfg(c => ({ ...c, [key]: val }));
    if (key === "resume") { setVerified(false); setVerifyResult(""); }
  };

  // ── File upload ──
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFileName(f.name);
    setUploadError("");
    setUploading(true);
    setVerified(false);
    setVerifyResult("");

    try {
      let text = "";

      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        try {
          text = await extractPdfText(f);
          if (!text || text.length < 30) {
            setUploadError(
              "This PDF looks like a scanned image — text can't be extracted. " +
              "Please use the Paste tab instead."
            );
            setUploading(false);
            return;
          }
        } catch {
          setUploadError(
            "Could not read this PDF. Please paste your resume text in the Paste tab."
          );
          setUploading(false);
          return;
        }
      } else {
        text = await f.text();
      }

      const cleaned = cleanText(text);

      if (cleaned.length < 50) {
        setUploadError("Not enough text found. Please paste your resume instead.");
        setUploading(false);
        return;
      }

      update("resume", cleaned);

    } catch (err: any) {
      setUploadError("Failed to read file. Please paste your resume text instead.");
    }

    setUploading(false);
  };

  // ── Verify resume ──
  const verifyResume = async () => {
    if (!cfg.resume || cfg.resume.length < 50) return;
    setVerifying(true); setVerifyResult("");
    try {
      const res  = await fetch("/api/stt/tokens", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mode: "verify_resume", resume: cfg.resume }),
      });
      const data = await res.json();
      setVerifyResult(data.summary || "Verified.");
      setVerified(true);
    } catch {
      setVerifyResult("Verification failed. Please try again.");
    }
    setVerifying(false);
  };

  const canStart = cfg.resume.trim().length > 50;

  return (
    <div className="space-y-5">

      {/* Company + Role */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: "companyName" as const, label: "Company",  placeholder: "e.g. BNSF Railway"          },
          { key: "role"        as const, label: "Role",     placeholder: "e.g. Infrastructure Engineer" },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block">
              {label}
            </label>
            <input
              value={cfg[key]}
              onChange={e => update(key, e.target.value)}
              placeholder={placeholder}
              className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/40 transition-colors placeholder:text-slate-800"
            />
          </div>
        ))}
      </div>

      {/* Job Description */}
      <div>
        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block">
          Job Description{" "}
          <span className="text-slate-800 normal-case font-normal tracking-normal">(optional)</span>
        </label>
        <textarea
          value={cfg.jobDescription}
          onChange={e => update("jobDescription", e.target.value)}
          placeholder="Paste the job description for more tailored answers..."
          rows={4}
          className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 text-sm text-slate-400 outline-none focus:border-blue-500/40 transition-colors resize-none placeholder:text-slate-800"
        />
      </div>

      {/* Resume */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              Resume <span className="text-red-500/70">*</span>
            </label>
            <p className="text-[10px] text-slate-800 mt-0.5">PDF or plain text</p>
          </div>
          <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.05]">
            {(["paste", "upload"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setUploadError(""); }}
                className={`px-4 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${
                  tab === t
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-slate-400"
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Paste */}
        {tab === "paste" && (
          <textarea
            value={cfg.resume}
            onChange={e => update("resume", e.target.value)}
            placeholder="Paste your full resume text here..."
            rows={10}
            className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-slate-300 font-mono leading-relaxed outline-none focus:border-blue-500/25 transition-colors resize-none placeholder:text-slate-800"
          />
        )}

        {/* Upload */}
        {tab === "upload" && (
          <div>
            <motion.div
              onClick={() => !uploading && fileRef.current?.click()}
              whileTap={{ scale: uploading ? 1 : 0.98 }}
              className={`
                border-2 border-dashed rounded-xl p-10 text-center transition-all
                min-h-[160px] flex flex-col items-center justify-center gap-3
                ${uploading
                  ? "border-blue-500/30 cursor-wait"
                  : uploadError
                  ? "border-red-500/20 cursor-pointer hover:border-red-400/40"
                  : cfg.resume && fileName
                  ? "border-emerald-500/25 cursor-pointer hover:border-emerald-400/40"
                  : "border-slate-800 cursor-pointer hover:border-slate-700"
                }
              `}
            >
              <input ref={fileRef} type="file" className="hidden"
                accept=".txt,.pdf,.doc,.docx" onChange={handleFile} />

              {uploading ? (
                <>
                  <Loader2 size={28} className="text-blue-400 animate-spin" />
                  <p className="text-blue-400 font-bold text-sm">Extracting text from PDF...</p>
                  <p className="text-slate-700 text-xs">This takes a few seconds</p>
                </>
              ) : uploadError ? (
                <>
                  <AlertCircle size={28} className="text-red-400" />
                  <p className="text-red-300 font-semibold text-sm text-center max-w-xs leading-relaxed">
                    {uploadError}
                  </p>
                  <p className="text-slate-700 text-xs">Click to try again</p>
                </>
              ) : cfg.resume && fileName ? (
                <>
                  <CheckCircle2 size={28} className="text-emerald-400" />
                  <p className="text-emerald-400 font-bold text-sm">{fileName}</p>
                  <p className="text-slate-600 text-xs">
                    {cfg.resume.length.toLocaleString()} characters extracted
                  </p>
                  <p className="text-slate-800 text-xs">Click to replace</p>
                </>
              ) : (
                <>
                  <UploadCloud size={28} className="text-slate-700" />
                  <div className="text-center">
                    <p className="text-slate-400 font-semibold text-sm mb-1">
                      Click to upload resume
                    </p>
                    <p className="text-slate-700 text-xs">PDF, TXT, DOC, DOCX</p>
                  </div>
                </>
              )}
            </motion.div>

            {!cfg.resume && !uploading && (
              <p className="text-[10px] text-slate-800 mt-2 ml-1">
                💡 If PDF fails, use Paste tab
              </p>
            )}
          </div>
        )}

        {/* Verify */}
        {canStart && (
          <div className="mt-4 pt-4 border-t border-white/[0.05]">
            <button onClick={verifyResume} disabled={verifying}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/8 hover:bg-emerald-500/15 text-emerald-500 border border-emerald-500/15 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
              {verifying
                ? <Loader2 size={14} className="animate-spin" />
                : verified
                ? <CheckCircle2 size={14} />
                : <Search size={14} />
              }
              {verifying ? "Verifying..." : verified ? "Resume verified ✓" : "Verify AI reads resume correctly"}
            </button>

            {verifyResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 p-4 bg-emerald-950/20 border border-emerald-500/15 rounded-xl"
              >
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">
                  Resume Scan:
                </p>
                <pre className="text-xs text-emerald-200/70 leading-relaxed whitespace-pre-wrap break-words font-mono">
                  {verifyResult}
                </pre>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => canStart && onStart(cfg)}
          disabled={!canStart}
          className={`flex-1 py-4 rounded-2xl font-black text-[15px] tracking-wide transition-all ${
            canStart
              ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:opacity-90 shadow-lg shadow-blue-500/15"
              : "bg-white/[0.03] text-slate-700 cursor-not-allowed border border-white/[0.05]"
          }`}
        >
          {canStart ? "Start Interview Session →" : "Add resume to continue"}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => canStart && onStealth(cfg)}
          disabled={!canStart}
          className={`hidden sm:flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold transition-all border ${
            canStart
              ? "border-white/10 text-slate-400 hover:bg-white/[0.03] hover:text-white"
              : "border-white/[0.04] text-slate-800 cursor-not-allowed"
          }`}
        >
          <ExternalLink size={15} />
          Stealth
        </motion.button>
      </div>

    </div>
  );
}