"use client";

import { useEffect, useState } from "react";
import type { BackgroundOption } from "@/lib/backgrounds";
import EventAccessGate from "../event-access";

type BackgroundState = BackgroundOption & { isCustom?: boolean };

export default function BackgroundsPage() {
  const [backgrounds, setBackgrounds] = useState<BackgroundState[]>([]);
  const [eventPlan, setEventPlan] = useState<string | undefined>(undefined);
  const [allowAiBackgrounds, setAllowAiBackgrounds] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [savingAllowed, setSavingAllowed] = useState(false);
  const [category, setCategory] = useState<"background" | "frame">("background");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
    fetch("/api/auth/event", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { event?: { plan?: string; allowAiBackgrounds?: boolean } }) => {
        if (data?.event?.plan) setEventPlan(data.event.plan);
        if (data?.event?.allowAiBackgrounds) setAllowAiBackgrounds(true);
      })
      .catch(() => {});
  }, []);

  async function generateAiBackground(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setError("Enter a prompt to generate a background.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, kind: "background" }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Generation failed.");
      }
      setMessage("AI background generated and added.");
      setAiPrompt("");
      await loadBackgrounds();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed.";
      setError(msg);
    } finally {
      setAiLoading(false);
    }
  }

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
    if (category === "frame" && eventPlan !== "event-ai") {
      setError("Frame uploads require the AI event plan ($30).");
      return;
    }

    setBackgroundUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", nameInput.value);
      formData.append("description", descInput.value);
      formData.append("file", file);
      formData.append("category", category);

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
      setCategory("background");
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

  async function saveAllowed() {
    setSavingAllowed(true);
    setError(null);
    setMessage(null);
    try {
      const allowedIds = backgrounds.filter((b) => b.allowed !== false).map((b) => b.id);
      const res = await fetch("/api/backgrounds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedIds }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Failed to save selection.");
      }
      setMessage("Background/frame availability saved.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save selection.";
      setError(msg);
    } finally {
      setSavingAllowed(false);
    }
  }

  return (
    <EventAccessGate>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(155,92,255,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(155,92,255,0.08),transparent_30%)]" />
        <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.25em] text-[var(--color-text-soft)]">
              Background library
            </p>
            <h1 className="text-3xl font-semibold">
              Curated sets and custom uploads
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Manage built-ins and your own uploads. Custom backgrounds can be removed;
              built-ins stay fixed.
            </p>
            <p className="text-xs text-[var(--color-text-soft)]">
              Toggle which backgrounds/frames are available in the booth. AI-generated frames may misplace text—review before enabling.
            </p>
          </div>

          {allowAiBackgrounds && (
            <form
              onSubmit={generateAiBackground}
              className="grid gap-3 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-text)]">Generate AI background</p>
                <span className="text-[11px] text-[var(--color-text-soft)]">Backgrounds only; upload frames separately.</span>
              </div>
              <label className="text-sm text-[var(--color-text-muted)]">
                Prompt (1:1 photobooth style)
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., snowy mountain cabin at sunset"
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={aiLoading}
                  className="rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)] disabled:opacity-50"
                >
                  {aiLoading ? "Generating..." : "Generate background"}
                </button>
              </div>
            </form>
          )}

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

          <form
            onSubmit={uploadBackground}
            className="grid gap-3 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-[var(--color-text-muted)]">
                Name
                <input
                  name="bgname"
                  required
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                  placeholder="Cozy Hearth"
                />
              </label>
              <label className="text-sm text-[var(--color-text-muted)]">
                Description (optional)
                <input
                  name="bgdesc"
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                  placeholder="Warm fireplace glow"
                />
              </label>
            </div>
            <label className="text-sm text-[var(--color-text-muted)]">
              Upload image
              <input
                name="bgfile"
                type="file"
                accept="image/*"
                required
                className="mt-2 w-full rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-3 text-sm text-[var(--color-text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[rgba(155,92,255,0.18)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-text)]"
              />
            </label>
            <label className="text-sm text-[var(--color-text-muted)]">
              Type
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as "background" | "frame")}
                className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
              >
                <option value="background">Background</option>
                {eventPlan === "event-ai" && <option value="frame">Frame (AI plan only)</option>}
              </select>
              <p className="mt-1 text-[11px] text-[var(--color-text-soft)]">
                Frames are upload-only and require the AI event plan. Frames should have transparent centers.
              </p>
            </label>
            <button
              type="submit"
              disabled={backgroundUploading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)] transition hover:opacity-95 disabled:opacity-50"
            >
              {backgroundUploading ? "Saving..." : "Add background"}
            </button>
          </form>

          <div className="flex justify-end">
            <button
              onClick={saveAllowed}
              disabled={savingAllowed}
              className="rounded-xl bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)] disabled:opacity-60"
            >
              {savingAllowed ? "Saving..." : "Save availability"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {backgrounds.map((bg) => (
              <div
                key={bg.id}
                className="flex items-center justify-between rounded-xl bg-[var(--color-surface)] px-4 py-3 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-text)]">{bg.name}</p>
                  <p className="text-xs text-[var(--color-text-soft)]">
                    {bg.description || "—"} {bg.isCustom ? "(custom)" : ""} {bg.category === "frame" ? "• Frame" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                    <input
                      type="checkbox"
                      checked={bg.allowed !== false}
                      onChange={(e) =>
                        setBackgrounds((prev) =>
                          prev.map((b) => (b.id === bg.id ? { ...b, allowed: e.target.checked } : b)),
                        )
                      }
                    />
                    Show
                  </label>
                  {bg.isCustom && (
                    <button
                      onClick={() => deleteBackground(bg.id)}
                      className="text-xs font-semibold text-[var(--color-danger)] hover:text-[var(--color-text)]"
                    >
                      Delete
                    </button>
                  )}
                </div>
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
    </EventAccessGate>
  );
}
