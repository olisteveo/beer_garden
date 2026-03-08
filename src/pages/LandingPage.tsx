import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    title: "3D Solar Tracking",
    description: "See real sunlight and shadows on a 3D map. Know exactly where the sun hits.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    ),
    title: "Real Weather",
    description: "Live cloud cover and UV data affect your sun forecast in real time.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 3L21 3L21 7" />
        <path d="M3 11V3H11" />
        <path d="M21 13V21H13" />
        <path d="M7 21L3 21L3 17" />
        <rect x="7" y="7" width="10" height="10" rx="1" />
      </svg>
    ),
    title: "Beer Garden Finder",
    description: "Pubs with outdoor seating highlighted with real OpenStreetMap data.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Time Travel",
    description: "Scrub the time slider to see where the sun will be later today.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Hero */}
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6"
        style={{ paddingTop: "var(--safe-top, 0px)" }}
      >
        {/* Logo / icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/30">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
          </svg>
        </div>

        <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-white">
          Pub Garden
        </h1>
        <p className="mb-10 max-w-xs text-center text-lg text-slate-400">
          Find the sunniest pub gardens near you
        </p>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <Link
            to="/register"
            className="block rounded-xl bg-amber-500 px-6 py-3.5 text-center text-base font-bold text-white shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-400"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="block rounded-xl border border-slate-600 px-6 py-3.5 text-center text-base font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            Sign In
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 animate-bounce text-slate-500">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M19 14l-7 7m0 0l-7-7" />
          </svg>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-20 pt-8">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">How it works</h2>
        <div className="mx-auto flex max-w-sm flex-col gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-slate-800/80 p-5 backdrop-blur-sm"
            >
              <div className="mb-3">{f.icon}</div>
              <h3 className="mb-1 text-base font-bold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* App Store placeholder */}
      <div className="px-6 pb-16 text-center">
        <p className="text-sm text-slate-500">Coming soon to iOS and Android</p>
      </div>

      {/* Footer */}
      <footer
        className="border-t border-slate-800 px-6 py-6 text-center text-xs text-slate-600"
        style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 24px)" }}
      >
        Made in London
      </footer>
    </div>
  );
}
