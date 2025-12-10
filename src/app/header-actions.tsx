"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionResponse = {
  business?: { name: string; slug: string };
  user?: { email: string };
};

export default function HeaderActions() {
  const [session, setSession] = useState<SessionResponse | null>(null);

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

  return (
    <Link
      href="/dashboard"
      className="rounded-full bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)] hover:ring-[var(--color-primary)]"
    >
      Go to dashboard
    </Link>
  );
}
