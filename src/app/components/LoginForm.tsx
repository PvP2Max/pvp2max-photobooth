"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirebaseClient } from "@/lib/firebase-client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registering, setRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { auth } = getFirebaseClient();
      if (registering) {
        // Create user in Firebase; business/event seeding should be done via owner APIs after login.
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
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
            Create Firebase account
          </label>

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
