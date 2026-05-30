import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — CoopilotX",
  description: "How CoopilotX handles your data.",
};

const LAST_UPDATED = "May 1, 2026";
const CONTACT_EMAIL = "support@coopilotxai.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Top bar */}
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to CoopilotX
        </Link>
        <span className="text-xs text-white/30">Updated {LAST_UPDATED}</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 uppercase tracking-widest mb-4">Legal</span>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Privacy Policy</h1>
          <p className="text-white/40 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-xl font-black text-white mb-3">1. Who we are</h2>
            <p>CoopilotX ("we", "us", "our") operates coopilotxai.com and the CoopilotX desktop apps for Windows and macOS. If you have questions about this policy, email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:underline">{CONTACT_EMAIL}</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">2. What we collect</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
                <h3 className="font-bold text-white mb-2">Account information</h3>
                <p className="text-sm">When you sign up, we collect your email address and, if you choose Google Sign-In, your Google profile name and photo. We use Firebase Authentication to manage accounts securely.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
                <h3 className="font-bold text-white mb-2">Resume content</h3>
                <p className="text-sm">Text you paste into the resume builder is sent to our backend to generate suggestions. We do not store your resume permanently — it exists only for the duration of your session and is discarded afterwards.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
                <h3 className="font-bold text-white mb-2">Interview audio</h3>
                <p className="text-sm">Audio captured during live interview sessions is processed entirely on your device. Raw audio is never transmitted to our servers. Only the resulting text transcript is sent as part of the prompt, and that text is not stored after the request is fulfilled.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
                <h3 className="font-bold text-white mb-2">Payment information</h3>
                <p className="text-sm">Payments are handled by Stripe. We never see or store your card number, CVV, or bank details. We only receive a transaction confirmation and your subscription status from Stripe.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
                <h3 className="font-bold text-white mb-2">Usage data</h3>
                <p className="text-sm">We log basic usage events (e.g., feature used, session count) to understand how the product is used. These logs contain no personally identifiable information beyond a hashed user ID.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">3. What we do NOT collect</h2>
            <ul className="list-none space-y-2 text-sm">
              {[
                "We do not record or store interview audio.",
                "We do not store conversation transcripts after a session ends.",
                "We do not sell your data to third parties.",
                "We do not use your data to train language models.",
                "We do not share your resume or interview content with employers or recruiters.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">4. How we use your data</h2>
            <p className="text-sm mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 text-sm pl-2">
              <li>Operate and maintain your account</li>
              <li>Process payments and manage your subscription</li>
              <li>Provide the resume builder, mock interview, and live copilot features</li>
              <li>Send you transactional emails (account confirmation, receipts)</li>
              <li>Debug issues and improve the product</li>
            </ul>
            <p className="text-sm mt-3">We will never send unsolicited marketing emails without your explicit consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">5. Third-party services</h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { name: "Firebase (Google)", purpose: "Authentication and user account management" },
                { name: "Stripe", purpose: "Payment processing and subscription management" },
                { name: "Groq", purpose: "LLM inference for answer generation (text only, no audio)" },
                { name: "Speechmatics", purpose: "Real-time speech-to-text transcription (audio stays on device)" },
              ].map((s, i) => (
                <div key={i} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="font-bold text-white text-xs mb-1">{s.name}</p>
                  <p className="text-white/50">{s.purpose}</p>
                </div>
              ))}
            </div>
            <p className="text-sm mt-4">Each of these providers has their own privacy policy. We only share the minimum data required for the service to function.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">6. Data retention</h2>
            <p className="text-sm">Account data is retained as long as your account is active. If you delete your account, all associated data is permanently removed within 30 days. Session transcripts are discarded immediately after the session ends and are never stored on our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">7. Your rights</h2>
            <p className="text-sm mb-3">Depending on where you live, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-sm pl-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Object to or restrict certain types of processing</li>
              <li>Data portability</li>
            </ul>
            <p className="text-sm mt-3">To exercise any of these rights, email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:underline">{CONTACT_EMAIL}</a>. We will respond within 14 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">8. Security</h2>
            <p className="text-sm">We use HTTPS for all data in transit. Passwords are never stored — authentication is handled entirely through Firebase and Google OAuth. Payment data is handled exclusively by Stripe and never touches our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">9. Changes to this policy</h2>
            <p className="text-sm">If we make material changes to this policy, we will notify you via email or a notice on the website at least 14 days before the change takes effect. The "last updated" date at the top of this page will always reflect the most recent version.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">10. Contact</h2>
            <p className="text-sm">Questions? Email us: <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:underline">{CONTACT_EMAIL}</a></p>
          </section>

        </div>
      </div>

      {/* Footer strip */}
      <div className="border-t border-white/[0.06] px-6 py-6 text-center text-xs text-white/20">
        <div className="flex justify-center gap-6">
          <Link href="/terms" className="hover:text-white/50 transition-colors">Terms of Service</Link>
          <Link href="/cookies" className="hover:text-white/50 transition-colors">Cookie Policy</Link>
          <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}
