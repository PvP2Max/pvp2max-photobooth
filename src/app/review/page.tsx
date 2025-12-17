"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, ChevronRight, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import EventAccessGate from "../event-access";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import PhotoGrid from "../components/review/PhotoGrid";
import SlotManager from "../components/review/SlotManager";
import BackgroundSelector from "../components/review/BackgroundSelector";
import TransformControls from "../components/review/TransformControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner, LoadingOverlay } from "@/components/ui/loading-spinner";
import { StepIndicator } from "@/components/ui/step-indicator";
import type {
  Photo,
  Transform,
  Slot,
  BackgroundState,
} from "../components/review/types";

const PREVIEW_MAX_WIDTH = 1280;
const PREVIEW_MAX_HEIGHT = 720;
const PREVIEW_ASSET_WIDTH = 1400;
const imageCache = new Map<string, Promise<HTMLImageElement>>();

const STEPS = [
  { id: "email", label: "Guest Email" },
  { id: "select", label: "Select Photos" },
  { id: "backgrounds", label: "Backgrounds" },
  { id: "send", label: "Send" },
];

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

  ctx.drawImage(cutout, drawX, drawY, targetWidth, targetHeight);
  return { dataUrl: canvas.toDataURL("image/png"), transform: usedTransform };
}

function ReviewPageContent() {
  const searchParams = useSearchParams();
  const eventSlug = searchParams.get("event") || "";

  const [searchEmail, setSearchEmail] = useState("");
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [sending, setSending] = useState(false);
  const [backgrounds, setBackgrounds] = useState<BackgroundState[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectionMap, setSelectionMap] = useState<Record<string, Slot[]>>({});
  const [step, setStep] = useState<"email" | "select" | "backgrounds" | "send">("email");
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [transforms, setTransforms] = useState<Record<string, Transform>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<string, boolean>>({});
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
  const currentPhotoId = currentPhoto?.id;

  const readyToSend = useMemo(() => {
    if (selectedPhotos.size === 0) return false;
    for (const id of selectedPhotos) {
      const slots = selectionMap[id];
      if (!slots || slots.length === 0) return false;
      const anyReady = slots.some((slot) => slot.backgroundId && slot.preview);
      if (!anyReady) return false;
    }
    return true;
  }, [selectedPhotos, selectionMap]);

  useEffect(() => {
    if (!eventSlug) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/notifications?event=${encodeURIComponent(eventSlug)}`, {
          headers: { "x-boothos-event": eventSlug },
        });
        const data = (await res.json()) as {
          notifications?: { email: string; count: number }[];
        };
        const notes = data.notifications ?? [];
        if (notes.length > 0) {
          notes.forEach((n) => {
            toast.info(`${n.email}'s photos uploaded`, {
              description: `${n.count} new photo(s) ready for review`,
            });
          });
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [eventSlug]);

  useEffect(() => {
    setCurrentBgIndex(0);
    if (step === "backgrounds" && selectedList.length === 0) {
      setStep("select");
    }
  }, [selectedList.length, step]);

  useEffect(() => {
    if (step !== "backgrounds" || !currentPhotoId) return;
    ensureSlotForPhoto(currentPhotoId);
    const slots = selectionMap[currentPhotoId];
    const slotIds = slots?.map((s) => s.id) ?? [];
    if (slots?.length && (!currentSlotId || !slotIds.includes(currentSlotId))) {
      setCurrentSlotId(slots[0].id);
    }
  }, [step, currentPhotoId, selectionMap, currentSlotId]);

  async function loadBackgrounds() {
    if (!eventSlug) return;
    try {
      const response = await fetch(`/api/backgrounds?event=${encodeURIComponent(eventSlug)}`, {
        headers: { "x-boothos-event": eventSlug },
      });
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
      const msg = err instanceof Error ? err.message : "Failed to load backgrounds.";
      toast.error("Failed to load backgrounds", { description: msg });
    }
  }

  useEffect(() => {
    loadBackgrounds();
  }, []);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!searchEmail) {
      toast.error("Email required", { description: "Enter an email to search." });
      return;
    }
    setLoadingPhotos(true);
    try {
      const response = await fetch(`/api/photos?email=${encodeURIComponent(searchEmail)}&event=${encodeURIComponent(eventSlug)}`, {
        headers: { "x-boothos-event": eventSlug },
      });
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
        toast.info("No photos found", { description: "No photos yet for that email." });
        setStep("email");
        setSearchEmail("");
      } else {
        setStep("select");
        toast.success(`${payload.photos.length} photos loaded`, {
          description: "Invite the guest to pick their favorites.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to search.";
      toast.error("Search failed", { description: msg });
    } finally {
      setLoadingPhotos(false);
    }
  }

  function togglePhoto(id: string) {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  function duplicateSlot(photoId: string, slotId: string) {
    setSelectionMap((prev) => {
      const existing = prev[photoId] ?? [];
      const slot = existing.find((s) => s.id === slotId);
      if (!slot) return prev;
      const clone: Slot = { ...slot, id: createSlotId(), preview: slot.preview, transform: slot.transform };
      return { ...prev, [photoId]: [...existing, clone] };
    });
  }

  function removeSlot(photoId: string, slotId: string) {
    setSelectionMap((prev) => {
      const existing = prev[photoId] ?? [];
      if (existing.length <= 1) return prev;
      const filtered = existing.filter((s) => s.id !== slotId);
      return { ...prev, [photoId]: filtered };
    });
    setTransforms((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setPreviewLoading((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    if (currentSlotId === slotId) setCurrentSlotId(null);
  }

  async function pickBackground(photo: Photo, slotId: string, backgroundId: string) {
    const background = backgrounds.find((bg) => bg.id === backgroundId);
    if (!background) return;
    ensurePhotoSelected(photo.id);

    try {
      ensureSlotForPhoto(photo.id);
      const transform = transforms[slotId] || { scale: 1, offsetX: 0, offsetY: 0 };
      const cutoutSrc = photo.previewUrl ? photo.previewUrl : withPreview(photo.cutoutUrl, PREVIEW_ASSET_WIDTH);
      const backgroundSrc = background.previewAsset || withPreview(background.asset, PREVIEW_ASSET_WIDTH);
      setPreviewLoading((prev) => ({ ...prev, [slotId]: true }));
      const result = await composePreview(cutoutSrc, backgroundSrc, transform);
      const usedTransform = result.transform;
      setTransforms((prev) => ({ ...prev, [slotId]: usedTransform }));
      setSelectionMap((prev) => {
        const slots = prev[photo.id] ?? [];
        const nextSlots =
          slots.length === 0
            ? [{ id: slotId, backgroundId, preview: result.dataUrl, transform: usedTransform }]
            : slots.map((slot) =>
                slot.id === slotId
                  ? { ...slot, backgroundId, preview: result.dataUrl, transform: usedTransform }
                  : slot,
              );
        return { ...prev, [photo.id]: nextSlots };
      });
      setPreviewLoading((prev) => ({ ...prev, [slotId]: false }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not generate preview.";
      toast.error("Preview failed", { description: msg });
      setPreviewLoading((prev) => ({ ...prev, [slotId]: false }));
    }
  }

  async function refreshPreview(photo: Photo, slotId: string, nextTransform: Transform) {
    const slots = selectionMap[photo.id];
    const slot = slots?.find((s) => s.id === slotId);
    if (!slot?.backgroundId) return;
    const background = backgrounds.find((b) => b.id === slot.backgroundId);
    if (!background) return;
    const cutoutSrc = photo.previewUrl ? photo.previewUrl : withPreview(photo.cutoutUrl, PREVIEW_ASSET_WIDTH);
    const backgroundSrc = background.previewAsset || withPreview(background.asset, PREVIEW_ASSET_WIDTH);
    setPreviewLoading((prev) => ({ ...prev, [slotId]: true }));
    const result = await composePreview(cutoutSrc, backgroundSrc, nextTransform);
    setTransforms((prev) => ({ ...prev, [slotId]: result.transform }));
    setSelectionMap((prev) => {
      const updated = (prev[photo.id] || []).map((s) =>
        s.id === slotId ? { ...s, backgroundId: slot.backgroundId, preview: result.dataUrl, transform: result.transform } : s,
      );
      return { ...prev, [photo.id]: updated };
    });
    setPreviewLoading((prev) => ({ ...prev, [slotId]: false }));
  }

  async function advanceBackgroundStep() {
    if (!currentPhoto) return;
    if (currentBgIndex < selectedList.length - 1) {
      setCurrentBgIndex((prev) => prev + 1);
      setCurrentSlotId(null);
      return;
    }
    await sendEmail();
  }

  async function sendEmail() {
    if (!latestEmail) {
      toast.error("No email", { description: "Add a delivery email first." });
      return;
    }
    if (!readyToSend) {
      toast.error("Not ready", { description: "Pick backgrounds for all selected photos." });
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
            transform: slot.transform || transforms[slot.id] || { scale: 1, offsetX: 0, offsetY: 0 },
            matchBackground: slot.matchBackground ?? false,
          }));
      });

      if (selections.length === 0) {
        toast.error("No selections", { description: "Choose at least one background per photo." });
        setSending(false);
        return;
      }

      const response = await fetch(`/api/email?event=${encodeURIComponent(eventSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-boothos-event": eventSlug },
        body: JSON.stringify({ clientEmail: latestEmail, selections }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to send email.");

      setPhotos((prev) => prev.filter((photo) => !selectedPhotos.has(photo.id)));
      setSelectedPhotos(new Set());
      setSelectionMap({});
      toast.success("Photos sent!", { description: "Check inbox for delivery." });
      setTimeout(() => {
        window.location.href = "/review";
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error.";
      toast.error("Send failed", { description: msg });
    } finally {
      setSending(false);
    }
  }

  const hasPhotos = photos.length > 0;
  const hasSelections = selectedPhotos.size > 0;

  return (
    <EventAccessGate>
      <div className="min-h-screen bg-background text-foreground relative">
        {sending && <LoadingOverlay message="Sending photos..." />}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(155,92,255,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.12),transparent_20%)]" />
        <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12">
          <PageHeader
            title="Review Station"
            description="Step-by-step photo selection for guests"
            badge={<StepIndicator steps={STEPS} currentStep={step} variant="compact" />}
          />

          {/* Step 1: Email */}
          {step === "email" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-5" />
                  Guest Email
                </CardTitle>
                <CardDescription>
                  Enter the guest&apos;s email to load their photos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="email" className="sr-only">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="family@example.com"
                    />
                  </div>
                  <Button type="submit" variant="gradient" disabled={loadingPhotos}>
                    {loadingPhotos ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Loading...
                      </>
                    ) : (
                      "Load photos"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Select photos */}
          {step === "select" && hasPhotos && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Select Favorites</CardTitle>
                    <CardDescription>
                      Tap photos to select them ({selectedPhotos.size} selected)
                    </CardDescription>
                  </div>
                  <Button
                    variant="gradient"
                    onClick={() => {
                      Array.from(selectedPhotos).forEach((id) => ensureSlotForPhoto(id));
                      setCurrentBgIndex(0);
                      setStep("backgrounds");
                    }}
                    disabled={!hasSelections}
                  >
                    Next: Backgrounds
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <PhotoGrid
                  photos={photos}
                  selectedPhotos={selectedPhotos}
                  onTogglePhoto={togglePhoto}
                  withPreview={withPreview}
                  formatDate={formatDate}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Backgrounds */}
          {step === "backgrounds" && hasSelections && currentPhoto && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Choose Backgrounds</CardTitle>
                    <CardDescription>
                      Photo {currentBgIndex + 1} of {selectedList.length} - Add multiple backgrounds per photo
                    </CardDescription>
                  </div>
                  <Button
                    variant="gradient"
                    onClick={advanceBackgroundStep}
                    disabled={!currentPhoto || !photoHasReadySelection(selectionMap, currentPhoto.id)}
                  >
                    {currentBgIndex === selectedList.length - 1 ? (
                      <>
                        <Send className="size-4" />
                        Finish & Send
                      </>
                    ) : (
                      <>
                        Next Photo
                        <ChevronRight className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-2 items-start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{currentPhoto.originalName}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const newId = addSlot(currentPhoto.id);
                          setCurrentSlotId(newId);
                        }}
                      >
                        <Plus className="size-4" />
                        Add Slot
                      </Button>
                    </div>
                    <SlotManager
                      slots={selectionMap[currentPhoto.id] ?? []}
                      currentSlotId={currentSlotId}
                      backgrounds={backgrounds}
                      onSlotClick={setCurrentSlotId}
                      onDuplicateSlot={(slotId) => duplicateSlot(currentPhoto.id, slotId)}
                      onRemoveSlot={(slotId) => removeSlot(currentPhoto.id, slotId)}
                    />
                    <BackgroundSelector
                      backgrounds={backgrounds}
                      activeSlot={
                        selectionMap[currentPhoto.id]?.find((s) => s.id === currentSlotId) ||
                        selectionMap[currentPhoto.id]?.[0]
                      }
                      onSelectBackground={(backgroundId) => {
                        const slotId = currentSlotId || selectionMap[currentPhoto.id]?.[0]?.id || createSlotId();
                        setCurrentSlotId(slotId);
                        pickBackground(currentPhoto, slotId, backgroundId);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Add slots to deliver multiple backgrounds for one photo.
                    </p>
                  </div>
                  {(() => {
                    const slots = selectionMap[currentPhoto.id] ?? [];
                    const activeSlot = slots.find((s) => s.id === currentSlotId) || slots[0];
                    const transform = transforms[activeSlot?.id ?? ""] || activeSlot?.transform || { scale: 1, offsetX: 0, offsetY: 0 };
                    return (
                      <TransformControls
                        activeSlot={activeSlot}
                        transform={transform}
                        previewLoading={previewLoading[activeSlot?.id ?? ""] ?? false}
                        onTransformChange={(next) => {
                          if (!activeSlot) return;
                          setTransforms((prev) => ({ ...prev, [activeSlot.id]: next }));
                          if (previewTimers.current[activeSlot.id]) clearTimeout(previewTimers.current[activeSlot.id]);
                          previewTimers.current[activeSlot.id] = window.setTimeout(() => refreshPreview(currentPhoto, activeSlot.id, next), 90);
                        }}
                        onMatchBackgroundChange={(checked) => {
                          if (!activeSlot) return;
                          setSelectionMap((prev) => {
                            const updated = (prev[currentPhoto.id] || []).map((slot) =>
                              slot.id === activeSlot.id ? { ...slot, matchBackground: checked } : slot,
                            );
                            return { ...prev, [currentPhoto.id]: updated };
                          });
                          const next: Transform = { ...transform };
                          if (previewTimers.current[activeSlot.id]) clearTimeout(previewTimers.current[activeSlot.id]);
                          previewTimers.current[activeSlot.id] = window.setTimeout(() => refreshPreview(currentPhoto, activeSlot.id, next), 60);
                        }}
                        onReset={() => {
                          if (!activeSlot) return;
                          const reset: Transform = { scale: 1, offsetX: 0, offsetY: 0 };
                          setTransforms((prev) => ({ ...prev, [activeSlot.id]: reset }));
                          refreshPreview(currentPhoto, activeSlot.id, reset);
                        }}
                      />
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Send confirmation */}
          {step === "send" && hasSelections && readyToSend && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="size-5" />
                  Send to Guest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <Badge variant="secondary">
                    {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? "s" : ""} selected
                  </Badge>
                  <Badge variant="secondary">
                    {Object.values(selectionMap).reduce((acc, slots) => acc + slots.filter((s) => s.preview).length, 0)} previews ready
                  </Badge>
                  <Badge variant="secondary">{latestEmail || "No email"}</Badge>
                </div>
                <div className="mt-4">
                  <Button variant="gradient" size="lg" onClick={sendEmail} disabled={sending}>
                    {sending ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        Send Now
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </EventAccessGate>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><LoadingSpinner /></div>}>
      <ReviewPageContent />
    </Suspense>
  );
}
