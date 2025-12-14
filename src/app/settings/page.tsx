"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const session: { business?: { name?: string; slug?: string }; user?: { email?: string } } | null =
    null;

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Failed to update password.");
        return;
      }
      setMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-[var(--color-text)]">
      <div className="rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Account</p>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Manage your BoothOS account, access billing, and update your password.
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Business</p>
            <p className="font-semibold text-[var(--color-text)]">
              {session?.business?.name ?? "Not signed in"}
            </p>
            {session?.business && (
              <p className="text-xs text-[var(--color-text-muted)]">Slug: {session.business.slug}</p>
            )}
          </div>
          <div className="rounded-xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">User</p>
            <p className="font-semibold text-[var(--color-text)]">
              {session?.user?.email ?? "Not signed in"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Password</p>
            <form onSubmit={handlePasswordChange} className="mt-3 space-y-3">
              {error && (
                <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-lg bg-[var(--color-success-soft)] px-3 py-2 text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]">
                  {message}
                </div>
              )}
              <label className="block text-[var(--color-text-muted)]">
                Current password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </label>
              <label className="block text-[var(--color-text-muted)]">
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </label>
              <label className="block text-[var(--color-text-muted)]">
                Confirm new password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[var(--gradient-brand)] px-4 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)] disabled:opacity-60"
              >
                {saving ? "Updating…" : "Update password"}
              </button>
            </form>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Need changes to ownership or email? Contact support or rotate your API keys from the business console.
          </p>
        </div>
      </div>
    </main>
  );
}
