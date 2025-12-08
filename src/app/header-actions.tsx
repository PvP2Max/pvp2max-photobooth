"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionResponse = {
  business?: { name: string; slug: string };
  user?: { email: string };
};

export default function HeaderActions() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/business", { credentials: "include" })
      .then((res) => res.json())
      .then((data: SessionResponse & { error?: string }) => {
        if (!isMounted) return;
        if (!data.error) setSession(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/business", { method: "DELETE", credentials: "include" }).catch(() => {});
    setSession(null);
    setOpen(false);
    window.location.href = "/";
  }

  if (!session?.business) {
    return (
      <Link
        href="/dashboard"
        className="rounded-full bg-[var(--gradient-brand)] px-4 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_10px_25px_rgba(155,92,255,0.3)] transition hover:opacity-90"
      >
        Log in
      </Link>
    );
  }

  const label = session.user?.email ?? session.business.name ?? "Profile";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)]">
          {label.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{session.business.name}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[var(--color-surface)] p-2 text-sm shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-border-subtle)]">
          <div className="rounded-xl px-3 py-2 text-[var(--color-text-muted)]">
            {session.user?.email}
          </div>
          <Link
            href="/settings"
            className="block rounded-xl px-3 py-2 text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <Link
            href="/dashboard"
            className="block rounded-xl px-3 py-2 text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <button
            onClick={logout}
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-[var(--color-danger)] hover:bg-[var(--color-surface-elevated)]"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
