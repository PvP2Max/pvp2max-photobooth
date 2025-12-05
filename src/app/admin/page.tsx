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
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <h1 className="text-xl font-semibold text-white mb-3">Admin access</h1>
          <p className="text-sm text-slate-300/80 mb-4">
            Enter the admin password to manage production saves.
          </p>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400"
          />
          <button
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            onClick={() => setAuthed(tokenInput === PASSWORD)}
            disabled={!tokenInput}
          >
            Unlock
          </button>
          {tokenInput && tokenInput !== PASSWORD && (
            <p className="mt-2 text-xs text-red-300">Incorrect password.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-white">Production backups</h1>
          <div className="flex gap-2">
            <a
              href="/api/production/archive?token=ArcticAuraDesigns"
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/20"
            >
              Download all (tar.gz)
            </a>
            <button
              onClick={deleteAll}
              className="rounded-xl bg-red-500/80 px-3 py-2 text-xs font-semibold text-white ring-1 ring-red-300/50"
            >
              Delete all
            </button>
          </div>
        </div>

        {(message || error) && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ring-1 ${
              error
                ? "bg-red-500/10 text-red-100 ring-red-400/50"
                : "bg-emerald-500/10 text-emerald-100 ring-emerald-400/50"
            }`}
          >
            {error || message}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-300">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-300">No production saves yet.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.email}</p>
                    <p className="text-xs text-slate-400">
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
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-400"
                    />
                    <button
                      onClick={() => resend(item.id)}
                      className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950"
                    >
                      Resend
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="rounded-lg bg-red-500/80 px-3 py-2 text-xs font-semibold text-white"
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
                      className="rounded-lg bg-white/10 px-3 py-1 text-[11px] text-white ring-1 ring-white/15"
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
