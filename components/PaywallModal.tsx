// components/PaywallModal.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Zap, Crown, X } from "lucide-react";

interface PaywallModalProps {
  onClose: () => void;
  creditsRemaining: number;
  action: string; // e.g. "Mock Interview Session"
  creditsNeeded: number;
}

export default function PaywallModal({ onClose, creditsRemaining, action, creditsNeeded }: PaywallModalProps) {
  const router = useRouter();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 backdrop-blur-sm px-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative bg-slate-950 border border-slate-800 text-white p-8 rounded-2xl shadow-2xl w-full max-w-md"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors">
            <X size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap size={32} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Out of Credits</h2>
            <p className="text-slate-400 text-sm">
              <span className="text-white font-bold">{action}</span> requires{" "}
              <span className="text-amber-400 font-bold">{creditsNeeded} credits</span>.
              You have <span className="text-red-400 font-bold">{creditsRemaining}</span> remaining.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Basic — $12/mo</div>
                <div className="text-xs text-slate-400">1,000 credits/month</div>
              </div>
              <button
                onClick={() => router.push("/pricing")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition-all"
              >
                Upgrade
              </button>
            </div>

            <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Pro — $29/mo <Crown size={14} className="text-purple-400" />
                </div>
                <div className="text-xs text-slate-400">Unlimited credits</div>
              </div>
              <button
                onClick={() => router.push("/pricing")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold transition-all"
              >
                Upgrade
              </button>
            </div>
          </div>

          <button onClick={onClose} className="w-full py-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-sm text-slate-400 font-medium transition-all border border-slate-800">
            Maybe later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}