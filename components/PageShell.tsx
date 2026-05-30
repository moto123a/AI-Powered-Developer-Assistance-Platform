import Link from "next/link";

const NAV = [
  { label: "Features",     href: "/#features" },
  { label: "How it Works", href: "/#how-it-works" },
  { label: "Pricing",      href: "/pricing" },
];

export function PageHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.jpeg" alt="CoopilotX" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-[15px] font-black text-gray-900 tracking-tight">
            CoopilotX <span className="text-indigo-600">AI</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </Link>
      </div>
    </header>
  );
}

export function PageFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="CoopilotX" className="w-5 h-5 rounded object-contain opacity-60" />
          <span>© {new Date().getFullYear()} CoopilotX AI. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/#features"    className="hover:text-indigo-600 transition-colors">Features</Link>
          <Link href="/#how-it-works" className="hover:text-indigo-600 transition-colors">How it Works</Link>
          <Link href="/pricing"     className="hover:text-indigo-600 transition-colors">Pricing</Link>
          <Link href="/privacy"     className="hover:text-indigo-600 transition-colors">Privacy</Link>
          <Link href="/terms"       className="hover:text-indigo-600 transition-colors">Terms</Link>
          <Link href="/cookies"     className="hover:text-indigo-600 transition-colors">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
