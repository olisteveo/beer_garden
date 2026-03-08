import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { apiChangePassword, apiUpdateProfile, ApiError } from "../utils/api";

export function AccountPage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();

  // Display name editing
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  // Password change
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleNameSave(e: FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setNameBusy(true);
    setNameMsg(null);
    try {
      const updated = await apiUpdateProfile({ displayName: displayName.trim() });
      updateUser(updated);
      setEditingName(false);
      setNameMsg("Name updated");
      setTimeout(() => setNameMsg(null), 2000);
    } catch (err) {
      setNameMsg(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setNameBusy(false);
    }
  }

  async function handlePwChange(e: FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "Passwords don't match" });
      return;
    }
    setPwBusy(true);
    setPwMsg(null);
    try {
      await apiChangePassword(currentPw, newPw);
      setPwMsg({ type: "ok", text: "Password changed" });
      setShowPwForm(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwMsg({
        type: "err",
        text: err instanceof ApiError ? err.message : "Failed to change password",
      });
    } finally {
      setPwBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  if (!user) return null;

  const isEmailAuth = user.authProvider === "email";

  // First-letter avatar
  const initial = (user.displayName || user.email)[0]?.toUpperCase() ?? "?";

  return (
    <div
      className="min-h-screen bg-slate-900 px-6"
      style={{ paddingTop: "calc(var(--safe-top, 0px) + 16px)" }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center">
        <Link to="/settings" className="mr-3 text-slate-400 hover:text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-white">Account</h1>
      </div>

      {/* Avatar + Name */}
      <div className="mb-6 flex flex-col items-center">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="mb-3 h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500 text-3xl font-bold text-white">
            {initial}
          </div>
        )}

        {editingName ? (
          <form onSubmit={handleNameSave} className="flex items-center gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-center text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-amber-500/50"
              autoFocus
            />
            <button
              type="submit"
              disabled={nameBusy}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setEditingName(false); setDisplayName(user.displayName); }}
              className="text-xs text-slate-500"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-1 text-lg font-bold text-white"
          >
            {user.displayName}
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        {nameMsg && <p className="mt-1 text-xs text-green-400">{nameMsg}</p>}
      </div>

      {/* Info cards */}
      <section className="mb-6">
        <div className="flex flex-col gap-px overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between bg-slate-800/80 p-4">
            <span className="text-sm text-slate-400">Email</span>
            <span className="text-sm text-slate-300">{user.email}</span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/80 p-4">
            <span className="text-sm text-slate-400">Sign-in method</span>
            <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-300">
              {user.authProvider === "google" ? "Google" : "Email"}
            </span>
          </div>
        </div>
      </section>

      {/* Change password (email auth only) */}
      {isEmailAuth && (
        <section className="mb-6">
          {showPwForm ? (
            <form
              onSubmit={handlePwChange}
              className="flex flex-col gap-3 rounded-2xl bg-slate-800/80 p-4"
            >
              <h2 className="text-sm font-semibold text-white">Change Password</h2>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Current password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50"
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="New password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50"
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pwBusy}
                  className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {pwBusy ? "Saving..." : "Update Password"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPwForm(false)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowPwForm(true)}
              className="w-full rounded-2xl bg-slate-800/80 p-4 text-left text-sm text-slate-300 transition-colors hover:bg-slate-700/80"
            >
              Change password
            </button>
          )}
          {pwMsg && (
            <p
              className={`mt-2 text-xs ${
                pwMsg.type === "ok" ? "text-green-400" : "text-red-400"
              }`}
            >
              {pwMsg.text}
            </p>
          )}
        </section>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full rounded-2xl bg-red-900/30 p-4 text-center text-sm font-semibold text-red-400 transition-colors hover:bg-red-900/50"
      >
        Log Out
      </button>

      <footer
        className="py-8"
        style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 32px)" }}
      />
    </div>
  );
}
