"use client";

import { useEffect, useState } from "react";

type ProductionItem = {
  id: string;
  email: string;
  createdAt: string;
  attachments: { filename: string; contentType: string; size: number }[];
};

const PASSWORD = "ArcticAuraDesigns";

export default function AdminPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authed) {
      void loadItems();
    }
  }, [authed]);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/production", {
        headers: { "x-admin-token": PASSWORD },
      });
      const payload = (await res.json()) as { items?: ProductionItem[]; error?: string };
      if (!res.ok || !payload.items) throw new Error(payload.error || "Failed to load items");
      setItems(payload.items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load items";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: string) {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/production", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-token": PASSWORD },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(payload.error || "Failed to delete");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    setMessage("Deleted set.");
  }

  async function deleteAll() {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/production", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-token": PASSWORD },
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(payload.error || "Failed to delete all");
      return;
    }
    setItems([]);
    setMessage("Cleared all production saves.");
  }

  async function resend(id: string) {
    const email = resendEmail[id];
    if (!email) {
      setError("Enter an email to resend.");
      return;
    }
    setError(null);
    setMessage(null);
    const res = await fetch("/api/production/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": PASSWORD },
      body: JSON.stringify({ id, email }),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(payload.error || "Failed to resend email.");
      return;
    }
    setMessage("Resent photos.");
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
          <h1 className="text-xl font-semibold mb-3">Admin access</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Enter the admin password to manage production saves.
          </p>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)]"
          />
          <button
            className="mt-4 w-full rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)] disabled:opacity-50"
            onClick={() => setAuthed(tokenInput === PASSWORD)}
            disabled={!tokenInput}
          >
            Unlock
          </button>
          {tokenInput && tokenInput !== PASSWORD && (
            <p className="mt-2 text-xs text-[var(--color-danger)]">Incorrect password.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Admin</p>
            <h1 className="text-3xl font-semibold">Production backups</h1>
          </div>
          <div className="flex gap-2">
            <a
              href="/api/production/archive?token=ArcticAuraDesigns"
              className="rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] hover:bg-[var(--color-surface-elevated)]"
            >
              Download all (tar.gz)
            </a>
            <button
              onClick={deleteAll}
              className="rounded-xl bg-[var(--color-danger)]/90 px-3 py-2 text-xs font-semibold text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]"
            >
              Delete all
            </button>
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

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No production saves yet.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border-subtle)] space-y-3 shadow-[var(--shadow-soft)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{item.email}</p>
                    <p className="text-xs text-[var(--color-text-soft)]">
                      Saved {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Resend to email"
                      value={resendEmail[item.id] ?? ""}
                      onChange={(e) =>
                        setResendEmail((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--input-placeholder)]"
                    />
                    <button
                      onClick={() => resend(item.id)}
                      className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-on-primary)] shadow-[0_10px_25px_rgba(155,92,255,0.3)]"
                    >
                      Resend
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="rounded-lg bg-[var(--color-danger)]/85 px-3 py-2 text-xs font-semibold text-[var(--color-text)]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.attachments.map((a) => (
                    <a
                      key={a.filename}
                      href={`/api/production/files/${item.id}/${encodeURIComponent(a.filename)}?token=${PASSWORD}`}
                      className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-1 text-[11px] text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                    >
                      {a.filename} ({Math.round(a.size / 1024)} KB)
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
