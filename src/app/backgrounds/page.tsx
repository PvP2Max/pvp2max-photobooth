"use client";

import { useEffect, useState } from "react";
import type { BackgroundOption } from "@/lib/backgrounds";

type BackgroundState = BackgroundOption & { isCustom?: boolean };

export default function BackgroundsPage() {
  const [backgrounds, setBackgrounds] = useState<BackgroundState[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backgroundUploading, setBackgroundUploading] = useState(false);

  async function loadBackgrounds() {
    try {
      const response = await fetch("/api/backgrounds");
      const payload = (await response.json()) as {
        backgrounds?: BackgroundState[];
        error?: string;
      };
      if (!response.ok || !payload.backgrounds) {
        throw new Error(payload.error || "Could not load backgrounds.");
      }
      setBackgrounds(payload.backgrounds);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load backgrounds.";
      setError(msg);
    }
  }

  useEffect(() => {
    loadBackgrounds();
  }, []);

  async function uploadBackground(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("bgfile") as HTMLInputElement;
    const nameInput = form.elements.namedItem("bgname") as HTMLInputElement;
    const descInput = form.elements.namedItem("bgdesc") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choose a background file to upload.");
      return;
    }
    if (!nameInput.value.trim()) {
      setError("Give the background a name.");
      return;
    }

    setBackgroundUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", nameInput.value);
      formData.append("description", descInput.value);
      formData.append("file", file);

      const response = await fetch("/api/backgrounds", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        background?: BackgroundState;
        error?: string;
      };
      if (!response.ok || !payload.background) {
        throw new Error(payload.error || "Failed to add background.");
      }
      setBackgrounds((prev) => [...prev, payload.background!]);
      form.reset();
      setMessage("Background added.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not upload background.";
      setError(msg);
    } finally {
      setBackgroundUploading(false);
    }
  }

  async function deleteBackground(id: string) {
    setError(null);
    setMessage(null);
    const bg = backgrounds.find((b) => b.id === id);
    if (!bg?.isCustom) {
      setError("Only uploaded backgrounds can be removed.");
      return;
    }
    try {
      const response = await fetch("/api/backgrounds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete background.");
      }
      setBackgrounds((prev) => prev.filter((b) => b.id !== id));
      setMessage("Background removed.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not delete background.";
      setError(msg);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.14),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(190,24,93,0.12),transparent_30%)]" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-200/80">
            Background library
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Curated sets and custom uploads
          </h1>
          <p className="text-sm text-slate-300/80">
            Manage built-ins and your own uploads. Custom backgrounds can be removed;
            built-ins stay fixed.
          </p>
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
          onSubmit={uploadBackground}
          className="grid gap-3 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-200/80">
              Name
              <input
                name="bgname"
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                placeholder="Cozy Hearth"
              />
            </label>
            <label className="text-sm text-slate-200/80">
              Description (optional)
              <input
                name="bgdesc"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                placeholder="Warm fireplace glow"
              />
            </label>
          </div>
          <label className="text-sm text-slate-200/80">
            Upload image
            <input
              name="bgfile"
              type="file"
              accept="image/*"
              required
              className="mt-2 w-full rounded-xl border border-dashed border-white/15 bg-white/5 px-3 py-3 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/20 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </label>
          <button
            type="submit"
            disabled={backgroundUploading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:from-amber-200 hover:to-amber-400 disabled:opacity-50"
          >
            {backgroundUploading ? "Saving..." : "Add background"}
          </button>
        </form>

        <div className="grid gap-3 md:grid-cols-2">
          {backgrounds.map((bg) => (
            <div
              key={bg.id}
              className="flex items-center justify-between rounded-xl bg-black/15 px-4 py-3 ring-1 ring-white/5"
            >
              <div>
                <p className="font-semibold text-white">{bg.name}</p>
                <p className="text-xs text-slate-300/70">
                  {bg.description || "—"} {bg.isCustom ? "(custom)" : ""}
                </p>
              </div>
              {bg.isCustom && (
                <button
                  onClick={() => deleteBackground(bg.id)}
                  className="text-xs font-semibold text-red-200 hover:text-red-100"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
          {backgrounds.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-300">
              No backgrounds yet. Upload to get started.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
