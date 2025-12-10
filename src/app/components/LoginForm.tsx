"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registering, setRegistering] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessSlug, setBusinessSlug] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = registering ? "/api/auth/register" : "/api/auth/business";
      const payload = registering
        ? { email, password, businessName, businessSlug, eventName, eventSlug }
        : { email, password, businessSlug };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error || "Sign in failed.");
      }
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-soft)]">BoothOS</p>
          <h1 className="text-3xl font-semibold">Login</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Sign in with your BoothOS account. Toggle “Create account” if you’re new and need to seed your business and
            first event.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-3xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]"
        >
          {error && (
            <div className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]">
              {error}
            </div>
          )}
          <label className="text-sm text-[var(--color-text-muted)]">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
            />
          </label>
          <label className="text-sm text-[var(--color-text-muted)]">
            Business slug (optional)
            <input
              value={businessSlug}
              onChange={(e) => setBusinessSlug(e.target.value)}
              placeholder="your-company"
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
            />
            <span className="text-[11px] text-[var(--color-text-soft)]">
              Helps find the right account if you belong to multiple.
            </span>
          </label>
          <label className="text-sm text-[var(--color-text-muted)]">
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={registering}
              onChange={(e) => setRegistering(e.target.checked)}
              className="h-4 w-4"
            />
            Create account (seeds business + first event)
          </label>

          {registering && (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-[var(--color-text-muted)]">
                Business name
                <input
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
              <label className="text-sm text-[var(--color-text-muted)]">
                Business slug
                <input
                  required
                  value={businessSlug}
                  onChange={(e) => setBusinessSlug(e.target.value)}
                  placeholder="your-company"
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
              <label className="text-sm text-[var(--color-text-muted)]">
                Event name
                <input
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
              <label className="text-sm text-[var(--color-text-muted)]">
                Event slug
                <input
                  required
                  value={eventSlug}
                  onChange={(e) => setEventSlug(e.target.value)}
                  placeholder="holiday-2025"
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[var(--gradient-brand)] px-5 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90 disabled:opacity-60"
            >
              {registering ? "Create account" : loading ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRegistering((prev) => !prev);
              }}
              className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
            >
              {registering ? "Use existing account" : "Create a new account"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
