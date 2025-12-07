"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EventAccessGate from "../event-access";

type Checkin = { id: string; name: string; email: string; createdAt: string };

export default function CheckinPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCheckins() {
    try {
      const response = await fetch("/api/checkins");
      const payload = (await response.json()) as { checkins?: Checkin[]; error?: string };
      if (!response.ok || !payload.checkins) {
        throw new Error(payload.error || "Could not load check-ins.");
      }
      setCheckins(payload.checkins);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load check-ins.";
      setError(msg);
    }
  }

  useEffect(() => {
    loadCheckins();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const payload = (await response.json()) as { checkin?: Checkin; error?: string };
      if (!response.ok || !payload.checkin) {
        throw new Error(payload.error || "Unable to check in.");
      }
      setMessage("Checked in. The photographer dropdown is updated.");
      setName("");
      setEmail("");
      loadCheckins();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to check in.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <EventAccessGate>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(155,92,255,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(155,92,255,0.08),transparent_30%)]" />
        <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.25em] text-[var(--color-text-soft)]">Guest check-in</p>
            <h1 className="text-3xl font-semibold">Collect name + email before shooting</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Check guests in here so the photographer can pick their email from a dropdown. Front desk still
              types the email manually to keep addresses private at the counter.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
              <Link href="/photographer" className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 ring-1 ring-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]">
                Go to photographer lane
              </Link>
              <Link href="/frontdesk" className="rounded-full bg-[var(--color-surface)] px-3 py-1 ring-1 ring-[var(--color-border-subtle)] hover:bg-[var(--color-surface-elevated)]">
                Go to front desk
              </Link>
            </div>
          </div>

          {(message || error) && (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ring-1 ${
                error
                  ? "bg-[var(--color-danger-soft)] text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]"
                  : "bg-[var(--color-success-soft)] text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]"
              }`}
            >
              {error || message}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]"
          >
            <label className="text-sm text-[var(--color-text-muted)]">
              Name
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Taylor Brooks"
                className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
              />
            </label>
            <label className="text-sm text-[var(--color-text-muted)]">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="family@example.com"
                className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)] transition hover:opacity-95 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Check in guest"}
            </button>
            <p className="text-xs text-[var(--color-text-soft)]">
              The photographer dropdown refreshes every time they open the page or tap refresh.
            </p>
          </form>

          {checkins.length > 0 && (
            <section className="rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--color-text)]">Recent check-ins</p>
                <button
                  type="button"
                  onClick={loadCheckins}
                  className="text-xs text-[var(--color-accent-soft)] hover:text-[var(--color-accent)] underline"
                >
                  Refresh list
                </button>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-[var(--color-text-muted)]">
                {checkins.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl bg-[var(--color-surface-elevated)] px-3 py-2 ring-1 ring-[var(--color-border-subtle)]"
                  >
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{c.name}</p>
                      <p className="text-xs text-[var(--color-text-soft)]">{c.email}</p>
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-soft)]">
                      {new Date(c.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </EventAccessGate>
  );
}
