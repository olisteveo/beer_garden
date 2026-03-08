import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiForgotPassword, ApiError } from "../utils/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiForgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-900 px-6"
      style={{ paddingTop: "calc(var(--safe-top, 0px) + 16px)" }}
    >
      <Link to="/login" className="mb-6 flex items-center text-sm text-slate-400 hover:text-white">
        <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to login
      </Link>

      <h1 className="mb-2 text-center text-2xl font-extrabold text-white">Reset Password</h1>
      <p className="mb-8 text-center text-sm text-slate-400">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {sent ? (
        <div className="rounded-xl bg-green-900/30 px-5 py-4 text-center">
          <p className="text-sm font-medium text-green-400">
            If an account exists for <strong>{email}</strong>, you&apos;ll receive a reset link shortly.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block text-sm text-amber-400 hover:text-amber-300"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl bg-slate-800/80 px-4 py-3 text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-amber-500/50"
          />

          {error && (
            <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-amber-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}
    </div>
  );
}
