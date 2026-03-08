import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, GoogleButton } from "../auth";
import { ApiError } from "../utils/api";

const PW_RULES = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /\d/.test(p) },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allValid = PW_RULES.every((r) => r.test(password));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!allValid) {
      setError("Password does not meet the requirements.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await register(email, password, displayName);
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

      <h1 className="mb-8 text-center text-2xl font-extrabold text-white">Create Account</h1>

      {/* Google */}
      <GoogleButton text="signup_with" onError={setError} />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-700" />
        <span className="text-xs text-slate-500">or</span>
        <div className="h-px flex-1 bg-slate-700" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          autoComplete="name"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="rounded-xl bg-slate-800/80 px-4 py-3 text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-amber-500/50"
        />
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
          autoComplete="new-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-xl bg-slate-800/80 px-4 py-3 text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-amber-500/50"
        />

        {/* Password strength hints */}
        {password.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {PW_RULES.map((r) => (
              <span
                key={r.label}
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                  r.test(password)
                    ? "bg-green-900/40 text-green-400"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {r.test(password) ? "\u2713" : "\u2717"} {r.label}
              </span>
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-amber-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="text-amber-400 hover:text-amber-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
