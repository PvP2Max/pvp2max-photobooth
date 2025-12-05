"use client";

import { useState } from "react";

export default function PhotographerPage() {
  const [uploadEmail, setUploadEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!uploadEmail) {
      setError("Add the client email so we can keep photos grouped.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("email", uploadEmail);
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
          : `${successCount} photo(s) processed and ready.`,
      );
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
            Drop one or more shots per family; files are forwarded to bgremover and
            saved as cut-outs for the front desk. Keep this page mirrored cleanly for
            clients.
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
          onSubmit={handleUpload}
          className="grid gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10"
        >
          <label className="text-sm text-slate-200/80">
            Client email to attach uploads
            <input
              type="email"
              required
              value={uploadEmail}
              onChange={(e) => setUploadEmail(e.target.value)}
              placeholder="family@example.com"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-200/80">
            Select one or more photos
            <input
              name="file"
              type="file"
              accept="image/*"
              required
              multiple
              className="mt-2 w-full rounded-xl border border-dashed border-white/15 bg-white/5 px-3 py-3 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </label>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-emerald-300 disabled:opacity-50"
          >
            {uploading ? "Processing..." : "Upload & remove background"}
          </button>
          <p className="text-xs text-slate-300/70">
            We forward files to bgremover with the configured service token and keep
            the cut-outs locally until delivery.
          </p>
        </form>
      </main>
    </div>
  );
}
