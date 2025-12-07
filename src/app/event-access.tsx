"use client";

import { useEffect, useState } from "react";

type SessionResponse = {
  business: { id: string; name: string; slug: string; apiKeyHint?: string };
  event: {
    id: string;
    name: string;
    slug: string;
    status?: string;
    accessHint?: string;
  };
  expiresAt?: string;
};

type Props = {
  children: React.ReactNode;
};

export default function EventAccessGate({ children }: Props) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessSlug, setBusinessSlug] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [accessCode, setAccessCode] = useState("");

  useEffect(() => {
    const lastBiz = window.localStorage.getItem("boothos-last-business") ?? "";
    const lastEvent = window.localStorage.getItem("boothos-last-event") ?? "";
    setBusinessSlug(lastBiz);
    setEventSlug(lastEvent);
    refreshSession();
  }, []);

  async function refreshSession() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/event", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as SessionResponse;
        setSession(data);
        setError(null);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/auth/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessSlug, eventSlug, accessCode }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as SessionResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Invalid event credentials.");
        setSession(null);
        return;
      }
      setSession(data);
      window.localStorage.setItem("boothos-last-business", businessSlug);
      window.localStorage.setItem("boothos-last-event", eventSlug);
      setAccessCode("");
    } catch {
      setError("Could not reach the auth service.");
      setSession(null);
    }
  }

  async function handleSignOut() {
    await fetch("/api/auth/event", { method: "DELETE", credentials: "include" });
    setSession(null);
    setAccessCode("");
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center rounded-2xl bg-[var(--color-surface)] text-sm text-[var(--color-text-muted)] ring-1 ring-[var(--color-border-subtle)]">
        Checking BoothOS event access…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-soft)]">
              BoothOS Access
            </p>
            <h1 className="text-2xl font-semibold">Choose business + event</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Enter the business slug, event slug, and event key shared with this team.
            </p>
          </div>
          <div className="rounded-full bg-[rgba(155,92,255,0.16)] px-3 py-1 text-[11px] font-semibold text-[var(--color-primary-soft)] ring-1 ring-[var(--color-border-strong)]">
            BoothOS
          </div>
        </div>
        {error && (
          <div className="mb-3 rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]">
            {error}
          </div>
        )}
        <form onSubmit={handleSignIn} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-[var(--color-text-muted)]">
            Business slug
            <input
              required
              value={businessSlug}
              onChange={(e) => setBusinessSlug(e.target.value)}
              placeholder="kamron-james-photography"
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
            />
          </label>
          <label className="text-sm text-[var(--color-text-muted)]">
            Event slug
            <input
              required
              value={eventSlug}
              onChange={(e) => setEventSlug(e.target.value)}
              placeholder="military-ball-2025"
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
            />
          </label>
          <label className="text-sm text-[var(--color-text-muted)] md:col-span-2">
            Event key
            <input
              required
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="••••••"
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
            />
          </label>
          <div className="md:col-span-2 flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-soft)]">
              Keep this tab open to maintain your event session. Switching events will clear the session cookie.
            </p>
            <button
              type="submit"
              className="rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)]"
            >
              Unlock event
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--color-surface)] px-4 py-3 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">
            BoothOS event
          </p>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {session.business.name} • {session.event.name}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Slug: {session.business.slug} / {session.event.slug}
            {session.expiresAt ? ` • Expires ${new Date(session.expiresAt).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[rgba(34,197,94,0.14)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]">
            {session.event.status ?? "live"}
          </span>
          <button
            onClick={handleSignOut}
            className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]"
          >
            Switch event
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
