// app/real-interview/_components/SessionCard.tsx
// Single responsibility: display one session in dashboard only

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Clock,
  MessageSquare, Building2, Briefcase,
} from "lucide-react";
import type { Session } from "../_hooks/useSession";

type Props = {
  session:        Session;
  formatDate:     (ts: any) => string;
  formatDuration: (secs: number) => string;
};

export default function SessionCard({ session, formatDate, formatDuration }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Split turns into Q&A pairs for display
  const pairs: { question: string; answer: string }[] = [];
  const turns = session.turns || [];
  for (let i = 0; i < turns.length; i++) {
    if (turns[i].role === "interviewer") {
      const answer = turns[i + 1]?.role === "candidate" ? turns[i + 1].text : "";
      pairs.push({ question: turns[i].text, answer });
      if (answer) i++;
    }
  }

  return (
    <motion.div
      layout
      className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden"
    >
      {/* ── Card Header ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <MessageSquare size={16} className="text-blue-400" />
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              {session.companyName && session.companyName !== "Unknown" && (
                <span className="flex items-center gap-1 text-sm font-bold text-white">
                  <Building2 size={12} className="text-slate-500" />
                  {session.companyName}
                </span>
              )}
              {session.role && session.role !== "Unknown" && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Briefcase size={11} className="text-slate-600" />
                  {session.role}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-600">
              <span>{formatDate(session.createdAt)}</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatDuration(session.durationSecs)}
              </span>
              <span className="text-blue-500/70">
                {session.questionCount} question{session.questionCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Expand chevron */}
        <div className="text-slate-600 shrink-0 ml-4">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* ── Expanded Q&A ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
              {pairs.length === 0 ? (
                <p className="text-slate-600 text-sm italic">No Q&A recorded.</p>
              ) : (
                pairs.map((pair, i) => (
                  <div key={i} className="space-y-2">

                    {/* Question */}
                    <div className="flex gap-3 items-start">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-md shrink-0 mt-0.5">
                        Q{i + 1}
                      </span>
                      <p className="text-slate-300 text-sm font-medium leading-relaxed">
                        {pair.question}
                      </p>
                    </div>

                    {/* Answer */}
                    {pair.answer && (
                      <div className="ml-9 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                        {pair.answer.includes("•") ? (
                          <div className="space-y-2">
                            {pair.answer
                              .split("\n")
                              .map(l => l.trim())
                              .filter(Boolean)
                              .map((line, j) =>
                                line.startsWith("•") ? (
                                  <div key={j} className="flex gap-2 items-start">
                                    <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                      {line.slice(1).trim()}
                                    </p>
                                  </div>
                                ) : (
                                  <p key={j} className="text-slate-400 text-sm leading-relaxed">
                                    {line}
                                  </p>
                                )
                              )}
                          </div>
                        ) : (
                          <p className="text-slate-300 text-sm leading-relaxed">
                            {pair.answer}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Divider between pairs */}
                    {i < pairs.length - 1 && (
                      <div className="border-b border-white/5 pt-2" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}