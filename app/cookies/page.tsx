import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — CoopilotX",
  description: "How CoopilotX uses cookies and local storage.",
};

const LAST_UPDATED = "May 1, 2026";
const CONTACT_EMAIL = "support@coopilotxai.com";

const COOKIES = [
  {
    name: "__session",
    type: "Essential",
    duration: "Session",
    purpose: "Keeps you signed in during your current browser session. Set by Firebase Authentication.",
  },
  {
    name: "firebaseToken",
    type: "Essential",
    duration: "30 days",
    purpose: "Persists your login across browser restarts so you don't have to sign in every time.",
  },
  {
    name: "__stripe_mid",
    type: "Essential",
    duration: "1 year",
    purpose: "Used by Stripe to prevent fraud during the payment flow. Only present when you access the billing page.",
  },
  {
    name: "__stripe_sid",
    type: "Essential",
    duration: "Session",
    purpose: "Used by Stripe for the duration of a checkout session.",
  },
  {
    name: "cx_pref",
    type: "Functional",
    duration: "6 months",
    purpose: "Stores your UI preferences such as theme and interview mode settings so they persist between visits.",
  },
];

export default function CookiesPage() {
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
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 uppercase tracking-widest mb-4">Legal</span>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Cookie Policy</h1>
          <p className="text-white/40 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-10 text-white/70 leading-relaxed">

          <section>
            <p className="text-sm">CoopilotX uses a small number of cookies and browser storage to make the product work. This page explains exactly what we set, why, and how long each one lasts.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">What is a cookie?</h2>
            <p className="text-sm">A cookie is a small text file stored in your browser when you visit a website. Cookies let websites remember things like whether you are logged in. CoopilotX does not use advertising or tracking cookies of any kind.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">Cookies we use</h2>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                    <th className="text-left px-4 py-3 font-bold text-white/60 text-xs uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 font-bold text-white/60 text-xs uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 font-bold text-white/60 text-xs uppercase tracking-wider">Duration</th>
                    <th className="text-left px-4 py-3 font-bold text-white/60 text-xs uppercase tracking-wider">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {COOKIES.map((c, i) => (
                    <tr key={i} className={`border-b border-white/[0.05] ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}>
                      <td className="px-4 py-3 font-mono text-xs text-indigo-300 whitespace-nowrap">{c.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.type === "Essential"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                        }`}>{c.type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">{c.duration}</td>
                      <td className="px-4 py-3 text-xs text-white/60">{c.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">Local storage</h2>
            <p className="text-sm">In addition to cookies, CoopilotX uses browser <code className="text-indigo-300 bg-white/[0.06] px-1.5 py-0.5 rounded text-xs font-mono">localStorage</code> to store your resume draft and session preferences locally on your machine. This data never leaves your device unless you explicitly submit it through the app.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">What we do NOT use cookies for</h2>
            <ul className="space-y-2 text-sm">
              {[
                "We do not use advertising or retargeting cookies.",
                "We do not use third-party analytics cookies (no Google Analytics, no Meta Pixel).",
                "We do not track you across other websites.",
                "We do not sell cookie data to any third party.",
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
            <h2 className="text-xl font-black text-white mb-3">Managing cookies</h2>
            <p className="text-sm mb-3">You can control cookies through your browser settings. Blocking essential cookies will prevent you from staying signed in, but will not otherwise break the site.</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { browser: "Chrome", url: "chrome://settings/cookies" },
                { browser: "Firefox", url: "about:preferences#privacy" },
                { browser: "Safari", url: "Preferences → Privacy" },
                { browser: "Edge", url: "edge://settings/privacy" },
              ].map((b, i) => (
                <div key={i} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 flex items-center justify-between">
                  <span className="font-semibold text-white text-xs">{b.browser}</span>
                  <code className="text-[10px] text-indigo-300 font-mono">{b.url}</code>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">Changes to this policy</h2>
            <p className="text-sm">If we start using new cookies, we will update this page and notify you in the app before they are set. The "last updated" date at the top of this page reflects the current version.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-3">Contact</h2>
            <p className="text-sm">Questions? Email us: <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:underline">{CONTACT_EMAIL}</a></p>
          </section>

        </div>
      </div>

      {/* Footer strip */}
      <div className="border-t border-white/[0.06] px-6 py-6 text-center text-xs text-white/20">
        <div className="flex justify-center gap-6">
          <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white/50 transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}
