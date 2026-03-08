import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, GoogleButton } from "../auth";
import { ApiError } from "../utils/api";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate("/map", { replace: true });
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
      {/* Back */}
      <Link to="/" className="mb-6 flex items-center text-sm text-slate-400 hover:text-white">
        <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* Logo */}
      <h1 className="mb-8 text-center text-2xl font-extrabold text-white">Pub Garden</h1>

      {/* Google Sign-In */}
      <GoogleButton text="signin_with" onError={setError} />

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-700" />
        <span className="text-xs text-slate-500">or</span>
        <div className="h-px flex-1 bg-slate-700" />
      </div>

      {/* Email / Password form */}
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
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-xl bg-slate-800/80 px-4 py-3 text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-amber-500/50"
        />

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-amber-400 hover:text-amber-300">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-amber-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Footer link */}
      <p className="mt-8 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="text-amber-400 hover:text-amber-300">
          Sign up
        </Link>
      </p>
    </div>
  );
}
