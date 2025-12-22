"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Image as ImageIcon, Sparkles, Send, RefreshCw, Plus, Copy, Trash2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { BackgroundOption } from "@/lib/backgrounds";
import EventAccessGate from "../event-access";
import { useAuth } from "../auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/ui/page-header";
import { StepIndicator } from "@/components/ui/step-indicator";
import { LoadingSpinner, LoadingOverlay } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

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

  ctx.drawImage(
    cutout,
    drawX,
    drawY,
    targetWidth,
    targetHeight,
  );
  return { dataUrl: canvas.toDataURL("image/png"), transform: usedTransform };
}

function FrontdeskPageContent() {
  const searchParams = useSearchParams();
  const eventSlug = searchParams.get("event") || "";
  const { ready: authReady } = useAuth();

  const [searchEmail, setSearchEmail] = useState("");
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [sending, setSending] = useState(false);
  const [backgrounds, setBackgrounds] = useState<BackgroundState[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectionMap, setSelectionMap] = useState<Record<string, Slot[]>>({});
  const [error, setError] = useState<string | null>(null);
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

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

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
    // Wait for auth to be ready before making API calls
    if (!authReady || !eventSlug) return;
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
            toast.info(`${n.email}'s photos have been uploaded`, {
              description: `${n.count} photo(s) ready for review`,
            });
          });
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [authReady, eventSlug]);

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
      const msg =
        err instanceof Error ? err.message : "Failed to load backgrounds.";
      setError(msg);
    }
  }

  useEffect(() => {
    // Wait for auth to be ready before loading backgrounds
    if (!authReady) return;
    loadBackgrounds();
  }, [authReady]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!searchEmail) {
      toast.error("Missing email", {
        description: "Enter an email to search for that family's queue.",
      });
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
        toast.info("No photos yet", {
          description: "No photos have been uploaded for that email yet.",
        });
        setStep("email");
        setSearchEmail("");
      } else {
        setStep("select");
        toast.success(`Found ${payload.photos.length} photos`, {
          description: "Invite the guest to pick their favorites.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to search.";
      setError(msg);
      toast.error("Search failed", { description: msg });
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

  function duplicateSlot(photoId: string, slotId: string) {
    setSelectionMap((prev) => {
      const existing = prev[photoId] ?? [];
      const slot = existing.find((s) => s.id === slotId);
      if (!slot) return prev;
      const clone: Slot = {
        ...slot,
        id: createSlotId(),
        preview: slot.preview,
        transform: slot.transform,
      };
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
    if (currentSlotId === slotId) {
      setCurrentSlotId(null);
    }
  }

  async function pickBackground(photo: Photo, slotId: string, backgroundId: string) {
    const background = backgrounds.find((bg) => bg.id === backgroundId);
    if (!background) return;
    ensurePhotoSelected(photo.id);
    setError(null);

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
      setPreviewLoading((prev) => ({ ...prev, [slotId]: true }));
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
      setPreviewLoading((prev) => ({ ...prev, [slotId]: false }));
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not generate preview for that background.";
      setError(msg);
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
    const cutoutSrc = photo.previewUrl
      ? photo.previewUrl
      : withPreview(photo.cutoutUrl, PREVIEW_ASSET_WIDTH);
    const backgroundSrc =
      background.previewAsset || withPreview(background.asset, PREVIEW_ASSET_WIDTH);
    setPreviewLoading((prev) => ({ ...prev, [slotId]: true }));
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
    setPreviewLoading((prev) => ({ ...prev, [slotId]: false }));
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
    if (!latestEmail) {
      toast.error("Missing email", {
        description: "Add a delivery email first.",
      });
      return;
    }
    if (!readyToSend) {
      toast.error("Not ready", {
        description: "Pick at least one photo and a background for each selection.",
      });
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
        toast.error("No selections", {
          description: "Choose at least one background per selected photo.",
        });
        setSending(false);
        return;
      }

      const response = await fetch(`/api/email?event=${encodeURIComponent(eventSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-boothos-event": eventSlug },
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
      toast.success("Photos sent!", {
        description: "Your photos are on the way!",
      });
      // Soft reset after success.
      setTimeout(() => {
        window.location.href = "/frontdesk";
      }, 5000);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unexpected error sending email.";
      setError(msg);
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
        {sending && <LoadingOverlay message="Sending your photos..." />}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(155,92,255,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(155,92,255,0.08),transparent_30%)]" />
        <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12">
          <PageHeader
            title="Front desk"
            description="Simple, step-by-step flow for guests on an iPad."
          />

          <StepIndicator
            steps={STEPS}
            currentStep={currentStepIndex}
            variant="compact"
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="family@example.com"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="gradient"
                    disabled={loadingPhotos}
                    className="w-full sm:w-auto"
                  >
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
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="size-5" />
                      Select Favorites
                    </CardTitle>
                    <CardDescription>
                      Choose the photos you&apos;d like to receive
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      Array.from(selectedPhotos).forEach((id) => ensureSlotForPhoto(id));
                      setCurrentBgIndex(0);
                      setStep("backgrounds");
                    }}
                    disabled={!hasSelections}
                    variant="gradient"
                  >
                    Next: choose backgrounds
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {photos.map((photo) => {
                    const isSelected = selectedPhotos.has(photo.id);
                    return (
                      <Card
                        key={photo.id}
                        className={cn(
                          "overflow-hidden transition-all cursor-pointer group",
                          isSelected
                            ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                            : "hover:ring-1 hover:ring-border"
                        )}
                        onClick={() => togglePhoto(photo.id)}
                      >
                        <CardContent className="p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">
                                {photo.originalName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded {formatDate(photo.createdAt)}
                              </p>
                            </div>
                            <Button
                              variant={isSelected ? "default" : "secondary"}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePhoto(photo.id);
                              }}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="size-4" />
                                  Selected
                                </>
                              ) : (
                                "Select"
                              )}
                            </Button>
                          </div>
                          <div className="overflow-hidden rounded-xl bg-secondary">
                            <Image
                              src={photo.previewUrl || withPreview(photo.cutoutUrl, 900)}
                              alt={`Cutout for ${photo.originalName}`}
                              width={1200}
                              height={800}
                              unoptimized
                              loading="lazy"
                              className="h-48 w-full object-contain"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Backgrounds */}
          {step === "backgrounds" && hasSelections && currentPhoto && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="size-5" />
                      Choose Backgrounds
                    </CardTitle>
                    <CardDescription>
                      Photo {currentBgIndex + 1} of {selectedList.length} — Add multiple backgrounds per photo
                    </CardDescription>
                  </div>
                  <Button
                    onClick={advanceBackgroundStep}
                    disabled={
                      !currentPhoto ||
                      !photoHasReadySelection(selectionMap, currentPhoto.id)
                    }
                    variant="gradient"
                  >
                    {currentBgIndex === selectedList.length - 1
                      ? "Finish & send"
                      : "Next photo"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-2 items-start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {currentPhoto.originalName}
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const newId = addSlot(currentPhoto.id);
                          setCurrentSlotId(newId);
                        }}
                      >
                        <Plus className="size-4" />
                        Add slot
                      </Button>
                    </div>

                    {/* Slot tabs */}
                    <div className="flex flex-wrap gap-2">
                      {(selectionMap[currentPhoto.id] ?? []).map((slot) => {
                        const backgroundName = backgrounds.find(
                          (bg) => bg.id === slot.backgroundId,
                        )?.name;
                        const active = slot.id === currentSlotId;
                        return (
                          <Button
                            key={slot.id}
                            variant={active ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setCurrentSlotId(slot.id)}
                          >
                            {backgroundName || "Slot"}
                            {slot.preview && <Check className="size-3 ml-1" />}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Slot actions */}
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const slots = selectionMap[currentPhoto.id] ?? [];
                        const activeSlot =
                          slots.find((s) => s.id === currentSlotId) || slots[0];
                        if (!activeSlot) return null;
                        return (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => duplicateSlot(currentPhoto.id, activeSlot.id)}
                            >
                              <Copy className="size-4" />
                              Duplicate
                            </Button>
                            {slots.length > 1 && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => removeSlot(currentPhoto.id, activeSlot.id)}
                              >
                                <Trash2 className="size-4" />
                                Remove
                              </Button>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Background options */}
                    <div className="space-y-2">
                      <Label>Select background</Label>
                      <div className="flex flex-wrap gap-2">
                        {backgrounds.map((background) => {
                          const activeSlot =
                            selectionMap[currentPhoto.id]?.find((s) => s.id === currentSlotId) ||
                            selectionMap[currentPhoto.id]?.[0];
                          const isSelected =
                            activeSlot?.backgroundId === background.id;
                          return (
                            <Button
                              key={background.id}
                              variant={isSelected ? "default" : "secondary"}
                              size="sm"
                              onClick={() => {
                                const slotId =
                                  currentSlotId ||
                                  selectionMap[currentPhoto.id]?.[0]?.id ||
                                  createSlotId();
                                setCurrentSlotId(slotId);
                                pickBackground(currentPhoto, slotId, background.id);
                              }}
                            >
                              {background.name}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Use sliders to adjust position and scale. Add slots to deliver multiple backgrounds for one photo.
                    </p>
                  </div>

                  {/* Preview panel */}
                  {(() => {
                    const slots = selectionMap[currentPhoto.id] ?? [];
                    const activeSlot =
                      slots.find((s) => s.id === currentSlotId) || slots[0];
                    if (!activeSlot) {
                      return (
                        <EmptyState
                          icon={<ImageIcon className="size-6" />}
                          title="No background selected"
                          description="Add a background slot to start."
                        />
                      );
                    }
                    const transform =
                      transforms[activeSlot.id] ||
                      activeSlot.transform || { scale: 1, offsetX: 0, offsetY: 0 };
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Final preview
                          </p>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="match-bg"
                              checked={activeSlot.matchBackground ?? false}
                              onCheckedChange={(checked) => {
                                const isChecked = checked === true;
                                setSelectionMap((prev) => {
                                  const updated = (prev[currentPhoto.id] || []).map((slot) =>
                                    slot.id === activeSlot.id
                                      ? { ...slot, matchBackground: isChecked }
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
                            <Label htmlFor="match-bg" className="text-xs cursor-pointer">
                              Auto-match to background
                            </Label>
                          </div>
                        </div>
                        {activeSlot.preview && (
                          <div className="relative overflow-hidden rounded-xl ring-1 ring-border">
                            <Image
                              src={activeSlot.preview as string}
                              alt="Preview with background"
                              width={1920}
                              height={1080}
                              unoptimized
                              className="w-full rounded-xl"
                              style={{ aspectRatio: "16/9", objectFit: "cover" }}
                            />
                            {previewLoading[activeSlot.id] && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <LoadingSpinner size="lg" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Scale</Label>
                            <input
                              type="range"
                              min="0.25"
                              max="2.5"
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
                              className="w-full accent-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Offset X</Label>
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
                              className="w-full accent-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Offset Y</Label>
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
                              className="w-full accent-primary"
                            />
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const reset: Transform = { scale: 1, offsetX: 0, offsetY: 0 };
                            setTransforms((prev) => ({ ...prev, [activeSlot.id]: reset }));
                            refreshPreview(currentPhoto, activeSlot.id, reset);
                          }}
                        >
                          <RefreshCw className="size-4" />
                          Reset transforms
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Send */}
          {step === "send" && hasSelections && readyToSend && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="size-5" />
                      Send to Guest
                    </CardTitle>
                    <CardDescription>
                      Review and send the selected photos
                    </CardDescription>
                  </div>
                  <Button
                    onClick={sendEmail}
                    disabled={sending}
                    variant="gradient"
                  >
                    {sending ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Sending...
                      </>
                    ) : (
                      "Send now"
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl bg-secondary p-4 text-center">
                    <p className="text-2xl font-semibold">{selectedPhotos.size}</p>
                    <p className="text-xs text-muted-foreground">Photos selected</p>
                  </div>
                  <div className="rounded-xl bg-secondary p-4 text-center">
                    <p className="text-2xl font-semibold">
                      {Object.values(selectionMap).reduce(
                        (acc, slots) => acc + slots.filter((s) => s.preview).length,
                        0,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Ready previews</p>
                  </div>
                  <div className="rounded-xl bg-secondary p-4 text-center">
                    <p className="text-sm font-semibold truncate">{latestEmail || "—"}</p>
                    <p className="text-xs text-muted-foreground">Delivery email</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </EventAccessGate>
  );
}

export default function FrontdeskPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><LoadingSpinner /></div>}>
      <FrontdeskPageContent />
    </Suspense>
  );
}
