"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BackgroundOption } from "@/lib/backgrounds";

type Photo = {
  id: string;
  email: string;
  originalName: string;
  createdAt: string;
  originalUrl: string;
  cutoutUrl: string;
  previewUrl?: string;
};

type Transform = { scale: number; offsetX: number; offsetY: number };

type Slot = {
  id: string;
  backgroundId?: string;
  preview?: string;
  transform?: Transform;
  matchBackground?: boolean;
};

type BackgroundState = BackgroundOption & { isCustom?: boolean };

const PREVIEW_MAX_WIDTH = 1280;
const PREVIEW_MAX_HEIGHT = 720;
const PREVIEW_ASSET_WIDTH = 1400;
const imageCache = new Map<string, Promise<HTMLImageElement>>();

function photoHasReadySelection(
  selectionMap: Record<string, Slot[]>,
  photoId: string,
) {
  const slots = selectionMap[photoId] ?? [];
  return slots.some((slot) => slot.backgroundId);
}

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

function createSlotId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return Math.random().toString(36).slice(2);
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
  const [selectionMap, setSelectionMap] = useState<Record<string, Slot[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "select" | "backgrounds" | "send">(
    "email",
  );
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<string[]>([]);
  const [transforms, setTransforms] = useState<Record<string, Transform>>({});
  const previewTimers = useRef<Record<string, number>>({});

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
      const slots = selectionMap[id];
      if (!slots || slots.length === 0) return false;
      const anyReady = slots.some(
        (slot) => slot.backgroundId && slot.preview,
      );
      if (!anyReady) return false;
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

  useEffect(() => {
    if (step !== "backgrounds" || !currentPhoto) return;
    ensureSlotForPhoto(currentPhoto.id);
    const slots = selectionMap[currentPhoto.id];
    const slotIds = slots?.map((s) => s.id) ?? [];
    if (slots?.length && (!currentSlotId || !slotIds.includes(currentSlotId))) {
      setCurrentSlotId(slots[0].id);
    }
  }, [step, currentPhoto?.id, selectionMap, currentSlotId]);

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
       const first = payload.backgrounds[0];
       if (first?.asset || first?.previewAsset) {
         const src = first.previewAsset || withPreview(first.asset, PREVIEW_ASSET_WIDTH);
         loadImage(src).catch(() => {});
       }
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

  function ensureSlotForPhoto(id: string) {
    setSelectionMap((prev) => {
      if (prev[id]?.length) return prev;
      const slot: Slot = { id: createSlotId() };
      return { ...prev, [id]: [slot] };
    });
  }

  function addSlot(photoId: string, slotId: string = createSlotId()) {
    setSelectionMap((prev) => {
      const existing = prev[photoId] ?? [];
      const slot: Slot = { id: slotId };
      return { ...prev, [photoId]: [...existing, slot] };
    });
    return slotId;
  }

  async function pickBackground(photo: Photo, slotId: string, backgroundId: string) {
    const background = backgrounds.find((bg) => bg.id === backgroundId);
    if (!background) return;
    ensurePhotoSelected(photo.id);
    setError(null);
    setMessage(null);

    try {
      ensureSlotForPhoto(photo.id);
      const transform =
        transforms[slotId] || {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        };
      const cutoutSrc = photo.previewUrl
        ? photo.previewUrl
        : withPreview(photo.cutoutUrl, PREVIEW_ASSET_WIDTH);
      const backgroundSrc =
        background.previewAsset ||
        withPreview(background.asset, PREVIEW_ASSET_WIDTH);
      const result = await composePreview(
        cutoutSrc,
        backgroundSrc,
        transform,
      );
      const usedTransform = result.transform;
      setTransforms((prev) => ({ ...prev, [slotId]: usedTransform }));
      setSelectionMap((prev) => {
        const slots = prev[photo.id] ?? [];
        const nextSlots =
          slots.length === 0
            ? [{ id: slotId, backgroundId, preview: result.dataUrl, transform: usedTransform }]
            : slots.map((slot) =>
                slot.id === slotId
                  ? {
                      ...slot,
                      backgroundId,
                      preview: result.dataUrl,
                      transform: usedTransform,
                    }
                  : slot,
              );
        return { ...prev, [photo.id]: nextSlots };
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not generate preview for that background.";
      setError(msg);
    }
  }

  async function refreshPreview(photo: Photo, slotId: string, nextTransform: Transform) {
    const slots = selectionMap[photo.id];
    const slot = slots?.find((s) => s.id === slotId);
    if (!slot?.backgroundId) return;
    const background = backgrounds.find((b) => b.id === slot.backgroundId);
    if (!background) return;
    const cutoutSrc = photo.previewUrl
      ? photo.previewUrl
      : withPreview(photo.cutoutUrl, PREVIEW_ASSET_WIDTH);
    const backgroundSrc =
      background.previewAsset || withPreview(background.asset, PREVIEW_ASSET_WIDTH);
    const result = await composePreview(cutoutSrc, backgroundSrc, nextTransform);
    setTransforms((prev) => ({ ...prev, [slotId]: result.transform }));
    setSelectionMap((prev) => {
      const updated = (prev[photo.id] || []).map((s) =>
        s.id === slotId
          ? { ...s, backgroundId: slot.backgroundId, preview: result.dataUrl, transform: result.transform }
          : s,
      );
      return { ...prev, [photo.id]: updated };
    });
  }

  async function advanceBackgroundStep() {
    if (!currentPhoto) return;
    if (currentBgIndex < selectedList.length - 1) {
      setCurrentBgIndex((prev) => prev + 1);
      setCurrentSlotId(null);
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
      const selections = Array.from(selectedPhotos).flatMap((photoId) => {
        const slots = selectionMap[photoId] ?? [];
        return slots
          .filter((slot) => slot.backgroundId && slot.preview)
          .map((slot) => ({
            photoId,
            backgroundId: slot.backgroundId as string,
            transform:
              slot.transform ||
              transforms[slot.id] || { scale: 1, offsetX: 0, offsetY: 0 },
            matchBackground: slot.matchBackground ?? false,
          }));
      });

      if (selections.length === 0) {
        setError("Choose at least one background per selected photo.");
        setSending(false);
        return;
      }

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
                  Array.from(selectedPhotos).forEach((id) => ensureSlotForPhoto(id));
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
                        src={photo.previewUrl || withPreview(photo.cutoutUrl, 900)}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  Choose backgrounds (Photo {currentBgIndex + 1} of {selectedList.length})
                </p>
                <p className="text-xs text-slate-300/80">
                  Add multiple backgrounds per photo; each slot sends as its own image.
                </p>
              </div>
              <button
                onClick={advanceBackgroundStep}
                disabled={
                  !currentPhoto ||
                  !photoHasReadySelection(selectionMap, currentPhoto.id)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-pink-300 disabled:opacity-50"
              >
                {currentBgIndex === selectedList.length - 1
                  ? "Finish & send"
                  : "Next photo"}
              </button>
            </div>
            <article className="mt-4 grid gap-4 md:grid-cols-[1.05fr,1fr] items-start rounded-2xl bg-slate-900/60 p-4 ring-1 ring-white/5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {currentPhoto.originalName}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = addSlot(currentPhoto.id);
                      setCurrentSlotId(newId);
                    }}
                    className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100 ring-1 ring-white/15 hover:bg-white/15"
                  >
                    Add background slot
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selectionMap[currentPhoto.id] ?? []).map((slot) => {
                    const backgroundName = backgrounds.find(
                      (bg) => bg.id === slot.backgroundId,
                    )?.name;
                    const active = slot.id === currentSlotId;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setCurrentSlotId(slot.id)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          active
                            ? "border-cyan-300 bg-cyan-400/10 text-cyan-100"
                            : "border-white/10 bg-white/5 text-slate-200 hover:border-white/30"
                        }`}
                      >
                        {backgroundName || "Slot"} {slot.preview ? "✓" : ""}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {backgrounds.map((background) => {
                    const activeSlot =
                      selectionMap[currentPhoto.id]?.find((s) => s.id === currentSlotId) ||
                      selectionMap[currentPhoto.id]?.[0];
                    const isSelected =
                      activeSlot?.backgroundId === background.id;
                    return (
                      <button
                        key={background.id}
                        onClick={() => {
                          const slotId =
                            currentSlotId ||
                            selectionMap[currentPhoto.id]?.[0]?.id ||
                            createSlotId();
                          setCurrentSlotId(slotId);
                          pickBackground(currentPhoto, slotId, background.id);
                        }}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          isSelected
                            ? "border-cyan-300 bg-cyan-400/10 text-cyan-100"
                            : "border-white/10 bg-white/5 text-slate-200 hover:border-white/30"
                        }`}
                      >
                        {background.name}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-slate-300/80">
                  Tip: drag sliders to move/scale; add slots to deliver multiple backgrounds for one photo.
                </div>
              </div>
              {(() => {
                const slots = selectionMap[currentPhoto.id] ?? [];
                const activeSlot =
                  slots.find((s) => s.id === currentSlotId) || slots[0];
                if (!activeSlot) {
                  return (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/30 p-4 text-sm text-slate-300">
                      Add a background slot to start.
                    </div>
                  );
                }
                const transform =
                  transforms[activeSlot.id] ||
                  activeSlot.transform || { scale: 1, offsetX: 0, offsetY: 0 };
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-slate-300">
                        Final preview
                      </p>
                      <label className="flex items-center gap-2 text-xs text-slate-200/80">
                        <input
                          type="checkbox"
                          checked={activeSlot.matchBackground ?? false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectionMap((prev) => {
                              const updated = (prev[currentPhoto.id] || []).map((slot) =>
                                slot.id === activeSlot.id
                                  ? { ...slot, matchBackground: checked }
                                  : slot,
                              );
                              return { ...prev, [currentPhoto.id]: updated };
                            });
                            const next: Transform = { ...transform };
                            if (previewTimers.current[activeSlot.id]) {
                              clearTimeout(previewTimers.current[activeSlot.id]);
                            }
                            previewTimers.current[activeSlot.id] = window.setTimeout(
                              () => refreshPreview(currentPhoto, activeSlot.id, next),
                              60,
                            );
                          }}
                        />
                        Auto-match to background
                      </label>
                    </div>
                    {activeSlot.preview && (
                      <div className="overflow-hidden rounded-xl ring-1 ring-white/5">
                        <Image
                          src={activeSlot.preview as string}
                          alt="Preview with background"
                          width={1920}
                          height={1080}
                          unoptimized
                          className="w-full rounded-xl"
                          style={{ aspectRatio: "16/9", objectFit: "cover" }}
                        />
                      </div>
                    )}
                    <div className="grid gap-2 md:grid-cols-3">
                      <label className="text-xs text-slate-300/80">
                        Scale
                        <input
                          type="range"
                          min="0.1"
                          max="4"
                          step="0.01"
                          value={transform.scale}
                          onChange={(e) => {
                            const next: Transform = {
                              ...transform,
                              scale: parseFloat(e.target.value),
                            };
                            setTransforms((prev) => ({
                              ...prev,
                              [activeSlot.id]: next,
                            }));
                            if (previewTimers.current[activeSlot.id]) {
                              clearTimeout(previewTimers.current[activeSlot.id]);
                            }
                            previewTimers.current[activeSlot.id] = window.setTimeout(
                              () => refreshPreview(currentPhoto, activeSlot.id, next),
                              90,
                            );
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
                          value={transform.offsetX}
                          onChange={(e) => {
                            const next: Transform = {
                              ...transform,
                              offsetX: parseFloat(e.target.value),
                            };
                            setTransforms((prev) => ({
                              ...prev,
                              [activeSlot.id]: next,
                            }));
                            if (previewTimers.current[activeSlot.id]) {
                              clearTimeout(previewTimers.current[activeSlot.id]);
                            }
                            previewTimers.current[activeSlot.id] = window.setTimeout(
                              () => refreshPreview(currentPhoto, activeSlot.id, next),
                              90,
                            );
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
                          value={transform.offsetY}
                          onChange={(e) => {
                            const next: Transform = {
                              ...transform,
                              offsetY: parseFloat(e.target.value),
                            };
                            setTransforms((prev) => ({
                              ...prev,
                              [activeSlot.id]: next,
                            }));
                            if (previewTimers.current[activeSlot.id]) {
                              clearTimeout(previewTimers.current[activeSlot.id]);
                            }
                            previewTimers.current[activeSlot.id] = window.setTimeout(
                              () => refreshPreview(currentPhoto, activeSlot.id, next),
                              90,
                            );
                          }}
                          className="mt-1 w-full"
                        />
                      </label>
                    </div>
                  </div>
                );
              })()}
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
                {Object.values(selectionMap).reduce(
                  (acc, slots) => acc + slots.filter((s) => s.preview).length,
                  0,
                )}
              </p>
              <p>Delivery email: {latestEmail || "—"}</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
