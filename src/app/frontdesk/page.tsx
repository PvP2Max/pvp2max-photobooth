"use client";

import Image from "next/image";
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

type Transform = { scale: number; offsetX: number; offsetY: number };

type Selection = {
  backgroundId: string;
  preview?: string;
  transform?: Transform;
};

type BackgroundState = BackgroundOption & { isCustom?: boolean };

const PREVIEW_MAX_WIDTH = 1280;
const PREVIEW_MAX_HEIGHT = 720;
const PREVIEW_ASSET_WIDTH = 1400;
const imageCache = new Map<string, Promise<HTMLImageElement>>();

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(date));
}

function loadImage(src: string) {
  if (imageCache.has(src)) {
    return imageCache.get(src)!;
  }
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Image constructor is not available in this environment"));
      return;
    }
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.loading = "eager";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

function withPreview(url: string, width = PREVIEW_ASSET_WIDTH) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}preview=1&w=${width}`;
}

async function composePreview(
  cutoutUrl: string,
  backgroundUrl: string,
  transform?: Transform,
) {
  const [cutout, background] = await Promise.all([
    loadImage(cutoutUrl),
    loadImage(backgroundUrl),
  ]);

  const realBgWidth = background.width || PREVIEW_MAX_WIDTH;
  const realBgHeight = background.height || PREVIEW_MAX_HEIGHT;
  const scaleDown = Math.min(
    1,
    PREVIEW_MAX_WIDTH / Math.max(realBgWidth, 1),
    PREVIEW_MAX_HEIGHT / Math.max(realBgHeight, 1),
  );
  const width = Math.max(1, Math.round(realBgWidth * scaleDown));
  const height = Math.max(1, Math.round(realBgHeight * scaleDown));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create canvas context");

  ctx.drawImage(background, 0, 0, width, height);

  const baseScale = Math.min(
    (width * 0.55) / cutout.width,
    (height * 0.75) / cutout.height,
    1.1,
  );
  const appliedScale = transform?.scale ?? baseScale;
  const usedTransform: Transform = {
    scale: appliedScale,
    offsetX: transform?.offsetX ?? 0,
    offsetY: transform?.offsetY ?? 0,
  };

  const targetWidth = cutout.width * usedTransform.scale;
  const targetHeight = cutout.height * usedTransform.scale;
  const x = width / 2 - targetWidth / 2 + usedTransform.offsetX;
  const y = height * 0.18 + usedTransform.offsetY;
  const drawX = Math.min(Math.max(x, 0), Math.max(width - targetWidth, 0));
  const drawY = Math.min(Math.max(y, 0), Math.max(height - targetHeight, 0));

  ctx.drawImage(
    cutout,
    drawX,
    drawY,
    targetWidth,
    targetHeight,
  );
  return { dataUrl: canvas.toDataURL("image/png"), transform: usedTransform };
}

export default function FrontdeskPage() {
  const [searchEmail, setSearchEmail] = useState("");
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [sending, setSending] = useState(false);
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
  const [toasts, setToasts] = useState<string[]>([]);
  const [transforms, setTransforms] = useState<Record<string, Transform>>({});

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
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = (await res.json()) as {
          notifications?: { email: string; count: number }[];
        };
        const notes = data.notifications ?? [];
        if (notes.length > 0) {
          setToasts((prev) => [
            ...notes.map(
              (n) => `${n.email}'s photos have been uploaded (${n.count})`,
            ),
            ...prev,
          ]);
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
      if (payload.photos.length === 0) {
        setMessage("No photos yet for that email.");
        setStep("email");
        setSearchEmail("");
      } else {
        setStep("select");
        setMessage(
          `Loaded ${payload.photos.length} processed shots. Invite the guest to pick their favorites.`,
        );
      }
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

    try {
      const transform =
        transforms[photo.id] || {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        };
      const cutoutSrc = withPreview(photo.cutoutUrl, PREVIEW_ASSET_WIDTH);
      const backgroundSrc = withPreview(background.asset, PREVIEW_ASSET_WIDTH);
      const result = await composePreview(
        cutoutSrc,
        backgroundSrc,
        transform,
      );
      const usedTransform = result.transform;
      setTransforms((prev) => ({ ...prev, [photo.id]: usedTransform }));
      setSelectionMap((prev) => ({
        ...prev,
        [photo.id]: {
          backgroundId,
          preview: result.dataUrl,
          transform: usedTransform,
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

  async function refreshPreview(photo: Photo, nextTransform: Transform) {
    const backgroundId = selectionMap[photo.id]?.backgroundId;
    if (!backgroundId) return;
    const background = backgrounds.find((b) => b.id === backgroundId);
    if (!background) return;
    const cutoutSrc = withPreview(photo.cutoutUrl, PREVIEW_ASSET_WIDTH);
    const backgroundSrc = withPreview(background.asset, PREVIEW_ASSET_WIDTH);
    const result = await composePreview(cutoutSrc, backgroundSrc, nextTransform);
    setTransforms((prev) => ({ ...prev, [photo.id]: result.transform }));
    setSelectionMap((prev) => ({
      ...prev,
      [photo.id]: {
        backgroundId,
        preview: result.dataUrl,
        transform: result.transform,
      },
    }));
  }

  async function advanceBackgroundStep() {
    if (!currentPhoto) return;
    if (currentBgIndex < selectedList.length - 1) {
      setCurrentBgIndex((prev) => prev + 1);
      return;
    }
    // Last photo -> send immediately
    await sendEmail();
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
    setStep("send");
    try {
      const selections = Array.from(selectedPhotos).map((photoId) => ({
        photoId,
        backgroundId: selectionMap[photoId].backgroundId,
        transform:
          selectionMap[photoId].transform ||
          transforms[photoId] || { scale: 1, offsetX: 0, offsetY: 0 },
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
      setMessage("Your photos are on the way!");
      // Soft reset after success.
      setTimeout(() => {
        window.location.href = "/frontdesk";
      }, 5000);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unexpected error sending email.";
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  const hasPhotos = photos.length > 0;
  const hasSelections = selectedPhotos.size > 0;
  const popToast = () => {
    setToasts((prev) => prev.slice(1));
  };

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

        {toasts.length > 0 && (
          <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-2">
            {toasts.map((toast, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm text-white shadow-lg ring-1 ring-white/30"
              >
                {toast}
              </div>
            ))}
            <button
              onClick={popToast}
              className="self-end text-xs text-white/80 underline"
            >
              Dismiss
            </button>
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
                        src={withPreview(photo.cutoutUrl, 900)}
                        alt={`Cutout for ${photo.originalName}`}
                        width={1200}
                        height={800}
                        unoptimized
                        loading="lazy"
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
                onClick={advanceBackgroundStep}
                disabled={!selectionMap[currentPhoto.id]?.preview}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-pink-300 disabled:opacity-50"
              >
                {currentBgIndex === selectedList.length - 1
                  ? "Finish & send"
                  : "Next photo"}
              </button>
            </div>
            <article className="mt-4 grid gap-4 md:grid-cols-[1.05fr,1fr] items-start rounded-2xl bg-slate-900/60 p-4 ring-1 ring-white/5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">
                  {currentPhoto.originalName}
                </p>
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
                <div className="text-[11px] text-slate-300/80">
                  Tip: drag sliders to move/scale the subject before sending.
                </div>
              </div>
              {selectionMap[currentPhoto.id]?.preview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-slate-300">
                      Final preview
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-xl ring-1 ring-white/5">
                    <Image
                      src={selectionMap[currentPhoto.id]?.preview as string}
                      alt="Preview with background"
                      width={1920}
                      height={1080}
                      unoptimized
                      className="w-full rounded-xl"
                      style={{ aspectRatio: "16/9", objectFit: "cover" }}
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <label className="text-xs text-slate-300/80">
                      Scale
                      <input
                        type="range"
                        min="0.1"
                        max="4"
                        step="0.01"
                        value={transforms[currentPhoto.id]?.scale ?? 1}
                        onChange={async (e) => {
                          const next = {
                            ...(transforms[currentPhoto.id] || {
                              scale: 1,
                              offsetX: 0,
                              offsetY: 0,
                            }),
                            scale: parseFloat(e.target.value),
                          };
                          setTransforms((prev) => ({ ...prev, [currentPhoto.id]: next }));
                          await refreshPreview(currentPhoto, next);
                        }}
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="text-xs text-slate-300/80">
                      Offset X
                      <input
                        type="range"
                        min="-1500"
                        max="1500"
                        step="1"
                        value={transforms[currentPhoto.id]?.offsetX ?? 0}
                        onChange={async (e) => {
                          const next = {
                            ...(transforms[currentPhoto.id] || {
                              scale: 1,
                              offsetX: 0,
                              offsetY: 0,
                            }),
                            offsetX: parseFloat(e.target.value),
                          };
                          setTransforms((prev) => ({ ...prev, [currentPhoto.id]: next }));
                          await refreshPreview(currentPhoto, next);
                        }}
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="text-xs text-slate-300/80">
                      Offset Y
                      <input
                        type="range"
                        min="-1500"
                        max="1500"
                        step="1"
                        value={transforms[currentPhoto.id]?.offsetY ?? 0}
                        onChange={async (e) => {
                          const next = {
                            ...(transforms[currentPhoto.id] || {
                              scale: 1,
                              offsetX: 0,
                              offsetY: 0,
                            }),
                            offsetY: parseFloat(e.target.value),
                          };
                          setTransforms((prev) => ({ ...prev, [currentPhoto.id]: next }));
                          await refreshPreview(currentPhoto, next);
                        }}
                        className="mt-1 w-full"
                      />
                    </label>
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
                {sending ? "Sending..." : "Send now"}
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
