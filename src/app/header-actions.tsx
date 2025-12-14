"use client";

import Link from "next/link";

export default function HeaderActions() {
  return (
    <Link
      href="/dashboard"
      className="rounded-full bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)] hover:ring-[var(--color-primary)]"
    >
      Dashboard
    </Link>
  );
}
