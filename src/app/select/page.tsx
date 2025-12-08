"use client";

import { useState } from "react";

export default function SelectLanding() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLink(null);
    if (!email) {
      setError("Enter an email first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/selections/start${window.location.search}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sendEmail }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        shareUrl?: string;
        error?: string;
        emailed?: boolean;
      };
      if (!res.ok || !data.token) {
        setError(data.error || "Could not start selection.");
        return;
      }
      setLink(data.shareUrl || null);
      const status = data.emailed === false ? " Link not emailed (check SMTP/outbox)." : "";
      setMessage(`Selection link created.${status}`);
    } catch {
      setError("Failed to create selection link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Start guest selection</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Enter the guest email to create a selection link. You can send the link or hand the device to the guest.
        </p>
        {message && (
          <div className="mt-3 rounded-xl bg-[var(--color-success-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]">
            {error}
          </div>
        )}
        <form onSubmit={handleStart} className="mt-4 space-y-3">
          <label className="block text-sm text-[var(--color-text-muted)]">
            Guest email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
              placeholder="guest@example.com"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-primary-soft)]"
            />
            Email the link to the guest automatically
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)] disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create link"}
          </button>
        </form>
        {link && (
          <div className="mt-4 space-y-2 rounded-xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
            <p className="text-sm text-[var(--color-text-muted)]">Shareable link</p>
            <p className="break-all text-sm font-mono text-[var(--color-text)]">{link}</p>
            <button
              onClick={() => navigator.clipboard?.writeText(link).catch(() => {})}
              className="rounded-full bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold ring-1 ring-[var(--color-border-subtle)]"
            >
              Copy link
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
