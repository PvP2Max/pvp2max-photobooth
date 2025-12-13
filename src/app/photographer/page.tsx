"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import EventAccessGate from "../event-access";

type Checkin = { id: string; name: string; email: string; createdAt: string };

export default function PhotographerPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [selectedCheckinId, setSelectedCheckinId] = useState("");
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCheckin = useMemo(
    () => checkins.find((c) => c.id === selectedCheckinId),
    [checkins, selectedCheckinId],
  );

  const loadCheckins = useCallback(async () => {
    setLoadingCheckins(true);
    setError(null);
    try {
      const response = await fetch("/api/checkins");
      const payload = (await response.json()) as {
        checkins?: Checkin[];
        error?: string;
      };
      if (!response.ok || !payload.checkins) {
        throw new Error(payload.error || "Could not load check-ins.");
      }
      setCheckins(payload.checkins);
      if (payload.checkins.length > 0) {
        const stillValid = payload.checkins.find(
          (checkin) => checkin.id === selectedCheckinId,
        );
        setSelectedCheckinId(
          stillValid ? stillValid.id : payload.checkins[0].id,
        );
      } else {
        setSelectedCheckinId("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load check-ins.";
      setError(msg);
    } finally {
      setLoadingCheckins(false);
    }
  }, [selectedCheckinId]);

  useEffect(() => {
    loadCheckins();
  }, [loadCheckins]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) {
      setError("Choose at least one photo to upload first.");
      return;
    }
    if (!selectedCheckin?.email) {
      setError("Pick a checked-in guest first.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("email", selectedCheckin.email);
      for (const file of files) {
        formData.append("file", file);
      }

      const response = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        photos?: unknown;
        failures?: { fileName?: string; error?: string }[];
        error?: string;
      };
      if (!response.ok || !payload.photos) {
        throw new Error(payload.error || "Upload failed");
      }

      const successCount = Array.isArray(payload.photos)
        ? payload.photos.length
        : 1;
      const failureCount = payload.failures?.length ?? 0;

      setMessage(
        failureCount > 0
          ? `${successCount} photo(s) processed. ${failureCount} failed.`
          : `${successCount} photo(s) processed and ready for ${selectedCheckin.name}.`,
      );
      await loadCheckins();
      form.reset();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not upload the photo(s).";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <EventAccessGate>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(155,92,255,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(155,92,255,0.08),transparent_30%)]" />
        <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.25em] text-[var(--color-text-soft)]">
              Photographer lane
            </p>
            <h1 className="text-3xl font-semibold">
              Upload & auto-remove backgrounds
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Check guests in first, then pick their email from the dropdown so uploads stay grouped for the
              front desk.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
              <Link
                href="/checkin"
                className="rounded-full bg-[var(--color-surface)] px-3 py-1 ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
              >
                Open check-in
              </Link>
              <button
                type="button"
                onClick={loadCheckins}
                className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 text-left ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]"
              >
                Refresh dropdown
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

          <form
            onSubmit={handleUpload}
            className="grid gap-4 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]"
          >
            <label className="text-sm text-[var(--color-text-muted)]">
              Choose checked-in guest
              <select
                required
                value={selectedCheckinId}
                onChange={(e) => setSelectedCheckinId(e.target.value)}
                disabled={checkins.length === 0}
                className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none disabled:opacity-50"
              >
                <option value="" disabled>
                  {loadingCheckins ? "Loading..." : "Select a check-in"}
                </option>
                {checkins.map((checkin) => (
                  <option key={checkin.id} value={checkin.id} className="bg-slate-900 text-white">
                    {checkin.name} — {checkin.email}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-300/70">
                Add new guests on the check-in page; refresh to pull the latest list.
              </p>
            </label>
            <label className="text-sm text-slate-200/80">
              Select one or more photos
              <input
                name="file"
                type="file"
                accept="image/*"
                required
                multiple
                disabled={!selectedCheckin}
                className="mt-2 w-full rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-3 text-sm text-[var(--color-text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[rgba(155,92,255,0.18)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <button
              type="submit"
              disabled={uploading || !selectedCheckin}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)] transition hover:opacity-95 disabled:opacity-50"
            >
              {uploading ? "Processing..." : "Upload & remove background"}
            </button>
            <p className="text-xs text-[var(--color-text-soft)]">
              Files route to the MODNet bgremover (modnet.boothos.com) with the service token, then cut-outs stay
              local for the front desk until delivery.
            </p>
            {checkins.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                No check-ins yet. Add guests on the{" "}
                <Link href="/checkin" className="underline text-[var(--color-accent-soft)]">
                  check-in page
                </Link>{" "}
                before uploading.
              </div>
            )}
          </form>
        </main>
      </div>
    </EventAccessGate>
  );
}
