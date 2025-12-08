"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Photo = { id: string; originalUrl: string; cutoutUrl: string; previewUrl?: string; originalName: string };
type Background = { id: string; name: string; description?: string; asset: string; previewAsset?: string };

export default function SelectionPage() {
  const params = useParams<{ token: string }>();
  const search = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [allowed, setAllowed] = useState(3);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState<Record<string, { backgroundId: string }>>({});

  const business = search.get("business") ?? "";
  const event = search.get("event") ?? "";

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/selections/${params.token}?business=${business}&event=${event}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          email?: string;
          photos?: Photo[];
          backgrounds?: Background[];
          allowedSelections?: number;
          error?: string;
        };
        if (!res.ok || !data.photos || !data.backgrounds) {
          setError(data.error || "Selection link invalid or expired.");
          return;
        }
        setEmail(data.email ?? "");
        setPhotos(data.photos);
        setBackgrounds(data.backgrounds);
        setAllowed(data.allowedSelections ?? 3);
        if (data.backgrounds.length > 0) {
          const first = data.backgrounds[0].id;
          const defaults: Record<string, { backgroundId: string }> = {};
          for (const photo of data.photos) {
            defaults[photo.id] = { backgroundId: first };
          }
          setSelection(defaults);
        }
      } catch {
        setError("Failed to load selection.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.token, business, event]);

  const selectedIds = useMemo(() => Object.keys(selection), [selection]);

  function toggleSelect(photoId: string) {
    setSelection((prev) => {
      if (prev[photoId]) {
        const { [photoId]: _, ...rest } = prev;
        return rest;
      }
      if (Object.keys(prev).length >= allowed) return prev;
      const firstBg = backgrounds[0]?.id;
      return { ...prev, [photoId]: { backgroundId: firstBg || "" } };
    });
  }

  async function submit() {
    setError(null);
    setStatus(null);
    if (Object.keys(selection).length === 0) {
      setError("Select at least one photo.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        selections: Object.entries(selection).map(([photoId, cfg]) => ({
          photoId,
          backgroundId: cfg.backgroundId,
        })),
      };
      const res = await fetch(
        `/api/selections/${params.token}?business=${business}&event=${event}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Failed to send selections.");
        return;
      }
      setStatus("Your photos are on the way! Check your email.");
    } catch {
      setError("Failed to send selections.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center">
        <p className="text-sm text-[var(--color-text-muted)]">Loading selection…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center px-6">
        <div className="rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)]">
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Select your photos</p>
            <h1 className="text-3xl font-semibold">Hi {email || "guest"}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Choose up to {allowed} photo{allowed === 1 ? "" : "s"} and a background. We’ll email them to you.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 ring-1 ring-[var(--color-border-subtle)]">
              Selected {selectedIds.length} / {allowed}
            </span>
          </div>
        </div>

        {status && (
          <div className="rounded-xl bg-[var(--color-success-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]">
            {status}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {photos.map((photo) => {
            const selected = !!selection[photo.id];
            const preview = photo.previewUrl || photo.cutoutUrl || photo.originalUrl;
            return (
              <div
                key={photo.id}
                className={`relative overflow-hidden rounded-2xl ring-1 ring-[var(--color-border-subtle)] ${
                  selected ? "bg-[var(--color-surface)]" : "bg-[var(--color-surface-elevated)]"
                }`}
              >
                <img src={preview} alt={photo.originalName} className="h-52 w-full object-cover" />
                <div className="flex items-center justify-between px-3 py-2">
                  <button
                    onClick={() => toggleSelect(photo.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                      selected
                        ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] ring-[var(--color-primary)]"
                        : "bg-[var(--color-surface)] text-[var(--color-text)] ring-[var(--color-border-subtle)]"
                    }`}
                  >
                    {selected ? "Selected" : "Select"}
                  </button>
                  {selected && (
                    <select
                      value={selection[photo.id]?.backgroundId}
                      onChange={(e) =>
                        setSelection((prev) => ({
                          ...prev,
                          [photo.id]: { backgroundId: e.target.value },
                        }))
                      }
                      className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text)]"
                    >
                      {backgrounds.map((bg) => (
                        <option key={bg.id} value={bg.id}>
                          {bg.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-[var(--gradient-brand)] px-5 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)] disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send my photos"}
          </button>
        </div>
      </div>
    </main>
  );
}
