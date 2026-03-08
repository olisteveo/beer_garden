import { Link } from "react-router-dom";

export function SettingsPage() {
  return (
    <div
      className="min-h-screen bg-slate-900 px-6"
      style={{ paddingTop: "calc(var(--safe-top, 0px) + 16px)" }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center">
        <Link to="/map" className="mr-3 text-slate-400 hover:text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      {/* Search defaults */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Search
        </h2>
        <div className="rounded-2xl bg-slate-800/80 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Default radius</span>
            <span className="text-sm font-medium text-amber-400">800m</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Adjustable radius coming in a future update.
          </p>
        </div>
      </section>

      {/* Display */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Display
        </h2>
        <div className="flex flex-col gap-px overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between bg-slate-800/80 p-4 backdrop-blur-sm">
            <span className="text-sm text-slate-300">Units</span>
            <span className="text-sm font-medium text-slate-400">Metric</span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/80 p-4 backdrop-blur-sm">
            <span className="text-sm text-slate-300">Theme</span>
            <span className="text-sm font-medium text-slate-400">Dark</span>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          About
        </h2>
        <div className="flex flex-col gap-px overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between bg-slate-800/80 p-4 backdrop-blur-sm">
            <span className="text-sm text-slate-300">Version</span>
            <span className="text-xs text-slate-500">1.0.0</span>
          </div>
          <Link
            to="/account"
            className="flex items-center justify-between bg-slate-800/80 p-4 backdrop-blur-sm"
          >
            <span className="text-sm text-slate-300">Account</span>
            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>
      </section>

      <footer
        className="py-8 text-center text-xs text-slate-600"
        style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 32px)" }}
      >
        Pub Garden &middot; Made in London
      </footer>
    </div>
  );
}
