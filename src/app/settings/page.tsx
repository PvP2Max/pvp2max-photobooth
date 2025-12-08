"use client";

import { useEffect, useState } from "react";

type Session = {
  business?: { name: string; slug: string };
  user?: { email: string };
};

export default function SettingsPage() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    fetch("/api/auth/business", { credentials: "include" })
      .then((res) => res.json())
      .then((data: Session & { error?: string }) => {
        if (!data.error) setSession(data);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-[var(--color-text)]">
      <div className="rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Account</p>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Manage your BoothOS account. Additional profile settings will appear here soon.
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
          <p className="text-xs text-[var(--color-text-muted)]">
            Need changes? Contact support to update ownership, email, or subscription details.
          </p>
        </div>
      </div>
    </main>
  );
}
