"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { BackgroundOption } from "@/lib/backgrounds";

type Photo = {
  id: string;
  email: string;
  originalName: string;
  createdAt: string;
  originalUrl: string;
  cutoutUrl: string;
};

type Selection = {
  backgroundId: string;
  preview?: string;
};

type BackgroundState = BackgroundOption & { isCustom?: boolean };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(date));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Image constructor is not available in this environment"));
      return;
    }
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

async function composePreview(cutoutUrl: string, backgroundUrl: string) {
  const [cutout, background] = await Promise.all([
    loadImage(cutoutUrl),
    loadImage(backgroundUrl),
  ]);

  const width = background.width || cutout.width || 1280;
  const height = background.height || Math.round(width * 0.72);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create canvas context");

  ctx.drawImage(background, 0, 0, width, height);

  const maxWidth = width * 0.55;
  const maxHeight = height * 0.75;
  const scale = Math.min(
    maxWidth / cutout.width,
    maxHeight / cutout.height,
    1.1,
  );
  const targetWidth = cutout.width * scale;
  const targetHeight = cutout.height * scale;
  const x = width / 2 - targetWidth / 2;
  const y = height * 0.18;

  ctx.drawImage(cutout, x, y, targetWidth, targetHeight);
  return canvas.toDataURL("image/png");
}

export default function FrontdeskPage() {
  const [searchEmail, setSearchEmail] = useState("");
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [sending, setSending] = useState(false);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [backgrounds, setBackgrounds] = useState<BackgroundState[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectionMap, setSelectionMap] = useState<Record<string, Selection>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "select" | "backgrounds" | "send">(
    "email",
  );
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  const latestEmail = useMemo(() => searchEmail, [searchEmail]);
  const selectedList = useMemo(
    () => photos.filter((p) => selectedPhotos.has(p.id)),
    [photos, selectedPhotos],
  );
  const currentPhoto =
    step === "backgrounds" && selectedList.length > 0
      ? selectedList[Math.min(currentBgIndex, selectedList.length - 1)]
      : null;

  const readyToSend = useMemo(() => {
    if (selectedPhotos.size === 0) return false;
    for (const id of selectedPhotos) {
      const selection = selectionMap[id];
      if (!selection?.backgroundId || !selection.preview) return false;
    }
    return true;
  }, [selectedPhotos, selectionMap]);

  useEffect(() => {
    if (readyToSend) {
      setStep("send");
    } else if (step === "send") {
      setStep("backgrounds");
    }
  }, [readyToSend, step]);

  useEffect(() => {
    setCurrentBgIndex(0);
    if (step === "backgrounds" && selectedList.length === 0) {
      setStep("select");
    }
  }, [selectedList.length, step]);

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

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!searchEmail) {
      setError("Enter an email to search for that family's queue.");
      return;
    }
    setLoadingPhotos(true);
    try {
      const response = await fetch(
        `/api/photos?email=${encodeURIComponent(searchEmail)}`,
      );
      const payload = (await response.json()) as {
        photos?: Photo[];
        error?: string;
      };
      if (!response.ok || !payload.photos) {
        throw new Error(payload.error || "Could not load photos.");
      }
      setPhotos(payload.photos);
      setSelectedPhotos(new Set());
      setSelectionMap({});
      setStep("select");
      setMessage(
        payload.photos.length === 0
          ? "No photos yet for that email."
          : `Loaded ${payload.photos.length} processed shots. Invite the guest to pick their favorites.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to search.";
      setError(msg);
    } finally {
      setLoadingPhotos(false);
    }
  }

  function togglePhoto(id: string) {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function ensurePhotoSelected(id: string) {
    setSelectedPhotos((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  async function pickBackground(photo: Photo, backgroundId: string) {
    const background = backgrounds.find((bg) => bg.id === backgroundId);
    if (!background) return;
    ensurePhotoSelected(photo.id);
    setError(null);
    setMessage(null);

    setSelectionMap((prev) => ({
      ...prev,
      [photo.id]: {
        backgroundId,
        preview: prev[photo.id]?.preview,
      },
    }));

    try {
      const preview = await composePreview(photo.cutoutUrl, background.asset);
      setSelectionMap((prev) => ({
        ...prev,
        [photo.id]: {
          backgroundId,
          preview,
        },
      }));
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not generate preview for that background.";
      setError(msg);
    }
  }

  async function sendEmail() {
    setError(null);
    setMessage(null);
    if (!latestEmail) {
      setError("Add a delivery email first.");
      return;
    }
    if (!readyToSend) {
      setError("Pick at least one photo and a background for each selection.");
      return;
    }

    setSending(true);
    try {
      const selections = Array.from(selectedPhotos).map((photoId) => ({
        photoId,
        backgroundId: selectionMap[photoId].backgroundId,
        compositeDataUrl: selectionMap[photoId].preview as string,
      }));

      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: latestEmail,
          selections,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to send email.");
      }

      setPhotos((prev) => prev.filter((photo) => !selectedPhotos.has(photo.id)));
      setSelectedPhotos(new Set());
      setSelectionMap({});
      setMessage("Email queued and local files cleaned up.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unexpected error sending email.";
      setError(msg);
    } finally {
      setSending(false);
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
      setSelectionMap((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (next[key]?.backgroundId === id) {
            delete next[key];
          }
        }
        return next;
      });
      setMessage("Background removed.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not delete background.";
      setError(msg);
    }
  }

  const hasPhotos = photos.length > 0;
  const hasSelections = selectedPhotos.size > 0;
  const hasBackgroundPreviews =
    hasSelections &&
    Array.from(selectedPhotos).every(
      (id) => !!selectionMap[id]?.preview && !!selectionMap[id]?.backgroundId,
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.14),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(190,24,93,0.12),transparent_30%)]" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-white">Front desk</h1>
          <p className="text-sm text-slate-300/80">
            Simple, step-by-step flow for guests on an iPad.
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

        {/* Step 1: Email */}
        {step === "email" && (
          <section className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <form
              onSubmit={handleSearch}
              className="grid gap-3 md:grid-cols-[2fr,auto] md:items-end"
            >
              <label className="text-sm text-slate-200/80">
                Guest email
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="family@example.com"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={loadingPhotos}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:from-emerald-300 hover:to-lime-200 disabled:opacity-50"
              >
                {loadingPhotos ? "Loading..." : "Load photos"}
              </button>
            </form>
          </section>
        )}

        {/* Step 2: Select photos */}
        {step === "select" && hasPhotos && (
          <section className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Select favorites</p>
              </div>
              <button
                onClick={() => {
                  setCurrentBgIndex(0);
                  setStep("backgrounds");
                }}
                disabled={!hasSelections}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:from-emerald-300 hover:to-lime-200 disabled:opacity-50"
              >
                Next: choose backgrounds
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {photos.map((photo) => {
                const isSelected = selectedPhotos.has(photo.id);
                return (
                  <article
                    key={photo.id}
                    className="flex flex-col gap-2 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-white/5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {photo.originalName}
                        </p>
                        <p className="text-xs text-slate-400">
                          Uploaded {formatDate(photo.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => togglePhoto(photo.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          isSelected
                            ? "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/50"
                            : "bg-white/5 text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/5">
                      <Image
                        src={photo.cutoutUrl}
                        alt={`Cutout for ${photo.originalName}`}
                        width={1200}
                        height={800}
                        unoptimized
                        className="h-48 w-full object-contain bg-gradient-to-br from-slate-900 to-slate-800"
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Step 3: Backgrounds */}
        {step === "backgrounds" && hasSelections && currentPhoto && (
          <section className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  Choose a background
                </p>
                <p className="text-xs text-slate-300/80">
                  Photo {currentBgIndex + 1} of {selectedList.length}
                </p>
              </div>
              <button
                onClick={() => {
                  if (currentBgIndex < selectedList.length - 1) {
                    setCurrentBgIndex((prev) => prev + 1);
                  } else {
                    setStep("send");
                  }
                }}
                disabled={!selectionMap[currentPhoto.id]?.preview}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-pink-300 disabled:opacity-50"
              >
                {currentBgIndex === selectedList.length - 1
                  ? "Next: send email"
                  : "Next photo"}
              </button>
            </div>
            <article className="mt-4 grid gap-4 md:grid-cols-[1.1fr,1fr] items-start rounded-2xl bg-slate-900/60 p-4 ring-1 ring-white/5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">
                  {currentPhoto.originalName}
                </p>
                <div className="overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/5">
                  <Image
                    src={currentPhoto.cutoutUrl}
                    alt={`Cutout for ${currentPhoto.originalName}`}
                    width={1200}
                    height={800}
                    unoptimized
                    className="h-56 w-full object-contain bg-gradient-to-br from-slate-900 to-slate-800"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {backgrounds.map((background) => (
                    <button
                      key={background.id}
                      onClick={() => {
                        pickBackground(currentPhoto, background.id);
                      }}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        selectionMap[currentPhoto.id]?.backgroundId === background.id
                          ? "border-cyan-300 bg-cyan-400/10 text-cyan-100"
                          : "border-white/10 bg-white/5 text-slate-200 hover:border-white/30"
                      }`}
                    >
                      {background.name}
                    </button>
                  ))}
                </div>
              </div>
              {selectionMap[currentPhoto.id]?.preview && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-300">
                    Live preview
                  </p>
                  <div className="overflow-hidden rounded-xl ring-1 ring-white/5">
                    <Image
                      src={selectionMap[currentPhoto.id]?.preview as string}
                      alt="Preview with background"
                      width={1400}
                      height={900}
                      unoptimized
                      className="h-56 w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </article>
          </section>
        )}

        {/* Step 4: Send */}
        {step === "send" && hasSelections && readyToSend && (
          <section className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Send to guest</p>
              </div>
              <button
                onClick={sendEmail}
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-400 to-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:from-pink-300 hover:to-cyan-200 disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send set & clean up"}
              </button>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-300/80 md:grid-cols-3">
              <p>Selected: {selectedPhotos.size}</p>
              <p>
                Ready previews:{" "}
                {Object.values(selectionMap).filter((s) => s.preview).length}
              </p>
              <p>Delivery email: {latestEmail || "—"}</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
