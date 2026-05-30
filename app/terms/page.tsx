import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — CoopilotX",
  description: "Terms governing your use of CoopilotX.",
};

const LAST_UPDATED = "May 1, 2026";
const CONTACT_EMAIL = "support@coopilotxai.com";

export default function TermsPage() {
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
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 uppercase tracking-widest mb-4">Legal</span>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Terms of Service</h1>
          <p className="text-white/40 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-10 text-white/70 leading-relaxed">

          <section>
            <p className="text-sm">By accessing or using CoopilotX at coopilotxai.com or the CoopilotX desktop apps ("the Service"), you agree to these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">1. The Service</h2>
            <p className="text-sm">CoopilotX provides interview preparation tools including a resume builder, mock interview mode, and a live interview copilot. The Service is designed for personal, non-commercial job-search use.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">2. Eligibility</h2>
            <p className="text-sm">You must be at least 18 years old to use CoopilotX. By creating an account, you confirm that the information you provide is accurate and that you have the legal capacity to enter into this agreement.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">3. Your account</h2>
            <p className="text-sm">You are responsible for keeping your account credentials secure. You are responsible for all activity that occurs under your account. Notify us immediately at <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:underline">{CONTACT_EMAIL}</a> if you suspect unauthorised access.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">4. Acceptable use</h2>
            <p className="text-sm mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm pl-2">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to reverse-engineer, decompile, or extract the source code of the Service</li>
              <li>Use the Service to generate content that is harassing, defamatory, or fraudulent</li>
              <li>Attempt to circumvent any security or access controls</li>
              <li>Share your account with others or resell access to the Service</li>
              <li>Use automated scripts or bots to interact with the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">5. Subscriptions and payments</h2>
            <div className="space-y-3 text-sm">
              <p><span className="font-semibold text-white">Free tier:</span> CoopilotX offers a free tier with limited usage. No credit card is required to get started.</p>
              <p><span className="font-semibold text-white">Paid plans:</span> Paid subscriptions are billed monthly or annually via Stripe. Prices are shown on the pricing page and may change with 30 days' notice.</p>
              <p><span className="font-semibold text-white">Refunds:</span> If you are not satisfied within 7 days of your first paid subscription, contact us for a full refund. After 7 days, refunds are issued at our discretion.</p>
              <p><span className="font-semibold text-white">Cancellations:</span> You may cancel your subscription at any time. Your access continues until the end of the current billing period.</p>
              <p><span className="font-semibold text-white">Credits:</span> Unused credits do not roll over between billing periods and have no cash value.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">6. Intellectual property</h2>
            <p className="text-sm">All code, design, trademarks, and content that make up CoopilotX are owned by us or our licensors. You may not copy, reproduce, or distribute any part of the Service without our written permission. Content you create using the Service (e.g., your resume text) remains yours.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">7. Third-party services</h2>
            <p className="text-sm">The Service integrates with third-party providers including Stripe, Firebase, Groq, and Speechmatics. Use of these services is subject to their own terms. We are not responsible for the actions or content of third-party services.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">8. Disclaimer of warranties</h2>
            <p className="text-sm">The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or that the answers generated will be accurate or appropriate for every interview situation. Use the Service as a preparation aid, not as a substitute for your own judgment.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">9. Limitation of liability</h2>
            <p className="text-sm">To the maximum extent permitted by law, CoopilotX and its team will not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of employment opportunities. Our total liability for any claim is limited to the amount you paid us in the 3 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">10. Termination</h2>
            <p className="text-sm">We may suspend or terminate your account if you violate these Terms. You may delete your account at any time from your account settings. Upon termination, your right to use the Service ends immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">11. Changes to these Terms</h2>
            <p className="text-sm">We may update these Terms from time to time. If the changes are material, we will notify you by email at least 14 days before they take effect. Continued use of the Service after that date constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">12. Governing law</h2>
            <p className="text-sm">These Terms are governed by and construed in accordance with applicable laws. Any disputes will be resolved through good-faith negotiation first. If that fails, disputes will be submitted to binding arbitration.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">13. Contact</h2>
            <p className="text-sm">Questions about these Terms? Email us: <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:underline">{CONTACT_EMAIL}</a></p>
          </section>

        </div>
      </div>

      {/* Footer strip */}
      <div className="border-t border-white/[0.06] px-6 py-6 text-center text-xs text-white/20">
        <div className="flex justify-center gap-6">
          <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</Link>
          <Link href="/cookies" className="hover:text-white/50 transition-colors">Cookie Policy</Link>
          <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}
