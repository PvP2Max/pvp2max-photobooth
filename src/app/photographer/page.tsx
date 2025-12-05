"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

  async function loadCheckins() {
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
  }

  useEffect(() => {
    loadCheckins();
  }, []);

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
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.14),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(190,24,93,0.12),transparent_30%)]" />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80">
            Photographer lane
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Upload & auto-remove backgrounds
          </h1>
          <p className="text-sm text-slate-300/80">
            Check guests in first, then pick their email from the dropdown so uploads stay grouped for the
            front desk.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-300/80">
            <Link
              href="/checkin"
              className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10 transition hover:bg-white/15"
            >
              Open check-in
            </Link>
            <button
              type="button"
              onClick={loadCheckins}
              className="rounded-full bg-white/5 px-3 py-1 text-left ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Refresh dropdown
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

        <form
          onSubmit={handleUpload}
          className="grid gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10"
        >
          <label className="text-sm text-slate-200/80">
            Choose checked-in guest
            <select
              required
              value={selectedCheckinId}
              onChange={(e) => setSelectedCheckinId(e.target.value)}
              disabled={checkins.length === 0}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base text-white focus:border-cyan-300 focus:outline-none"
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
              className="mt-2 w-full rounded-xl border border-dashed border-white/15 bg-white/5 px-3 py-3 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={uploading || !selectedCheckin}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-emerald-300 disabled:opacity-50"
          >
            {uploading ? "Processing..." : "Upload & remove background"}
          </button>
          <p className="text-xs text-slate-300/70">
            Files route to bgremover with the service token, then cut-outs stay local for the front desk until
            delivery.
          </p>
          {checkins.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
              No check-ins yet. Add guests on the{" "}
              <Link href="/checkin" className="underline text-cyan-200">
                check-in page
              </Link>{" "}
              before uploading.
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
