"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.14),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(190,24,93,0.12),transparent_30%)]" />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80">Guest check-in</p>
          <h1 className="text-3xl font-semibold text-white">Collect name + email before shooting</h1>
          <p className="text-sm text-slate-300/80">
            Check guests in here so the photographer can pick their email from a dropdown. Front desk still
            types the email manually to keep addresses private at the counter.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-300/80">
            <Link href="/photographer" className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10 hover:bg-white/15">
              Go to photographer lane
            </Link>
            <Link href="/frontdesk" className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10 hover:bg-white/10">
              Go to front desk
            </Link>
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

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10"
        >
          <label className="text-sm text-slate-200/80">
            Name
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Taylor Brooks"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-200/80">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="family@example.com"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-emerald-300 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Check in guest"}
          </button>
          <p className="text-xs text-slate-300/70">
            The photographer dropdown refreshes every time they open the page or tap refresh.
          </p>
        </form>

        {checkins.length > 0 && (
          <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Recent check-ins</p>
              <button
                type="button"
                onClick={loadCheckins}
                className="text-xs text-cyan-200 hover:text-cyan-100 underline"
              >
                Refresh list
              </button>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-200/80">
              {checkins.slice(0, 6).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 ring-1 ring-white/10"
                >
                  <div>
                    <p className="font-semibold text-white">{c.name}</p>
                    <p className="text-xs text-slate-300/80">{c.email}</p>
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
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
  );
}
