"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCw, Send, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { BackgroundOption } from "@/lib/backgrounds";
import EventAccessGate from "../../event-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { StepIndicator } from "@/components/ui/step-indicator";
import { LoadingSpinner, LoadingOverlay } from "@/components/ui/loading-spinner";
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

type Stage =
  | "setup"
  | "test"
  | "ready"
  | "countdown"
  | "flash"
  | "review"
  | "processing"
  | "background"
  | "email"
  | "sending"
  | "sent";

const PREVIEW_MAX_WIDTH = 1280;
const PREVIEW_MAX_HEIGHT = 720;
const PREVIEW_ASSET_WIDTH = 1400;
const COUNTDOWN_SECONDS = 3;

const STEPS = [
  { id: "capture", label: "Capture" },
  { id: "background", label: "Background" },
  { id: "send", label: "Send" },
];

const imageCache = new Map<string, Promise<HTMLImageElement>>();

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

function getStepIndex(stage: Stage): number {
  if (["setup", "test", "ready", "countdown", "flash", "review", "processing"].includes(stage)) return 0;
  if (stage === "background") return 1;
  return 2;
}

export default function BoothPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedPhoto, setProcessedPhoto] = useState<Photo | null>(null);
  const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<BackgroundOption | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewTimerRef = useRef<number | null>(null);

  const currentStepIndex = getStepIndex(stage);

  // Load backgrounds on mount
  useEffect(() => {
    async function loadBackgrounds() {
      try {
        const response = await fetch("/api/backgrounds");
        const payload = (await response.json()) as {
          backgrounds?: BackgroundOption[];
          error?: string;
        };
        if (!response.ok || !payload.backgrounds) {
          throw new Error(payload.error || "Could not load backgrounds.");
        }
        setBackgrounds(payload.backgrounds);
        if (payload.backgrounds.length > 0) {
          const first = payload.backgrounds[0];
          if (first?.asset || first?.previewAsset) {
            const src = first.previewAsset || withPreview(first.asset, PREVIEW_ASSET_WIDTH);
            loadImage(src).catch(() => {});
          }
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load backgrounds.";
        setError(msg);
      }
    }
    loadBackgrounds();
  }, []);

  // Setup camera
  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStage("test");
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera access denied.";
      setError(msg);
      toast.error("Camera error", { description: msg });
    }
  }

  // Stop camera
  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  // Countdown timer
  useEffect(() => {
    if (stage === "countdown") {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        capturePhoto();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, countdown]);

  // Capture photo from video
  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flash effect
    setStage("flash");
    setTimeout(() => {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      setCapturedImage(dataUrl);
      stopCamera();
      setStage("review");
    }, 300);
  }

  // Retake photo
  function retakePhoto() {
    setCapturedImage(null);
    setProcessedPhoto(null);
    setPreviewUrl(null);
    setSelectedBackground(null);
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    setStage("setup");
  }

  // Process photo (background removal)
  async function processPhoto() {
    if (!capturedImage) return;
    setStage("processing");
    setError(null);

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], "photo.png", { type: "image/png" });

      // Upload to API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", email || "guest@booth.local");

      const uploadResponse = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });

      const payload = (await uploadResponse.json()) as {
        photos?: Photo[];
        error?: string;
      };

      if (!uploadResponse.ok || !payload.photos || payload.photos.length === 0) {
        throw new Error(payload.error || "Failed to process photo.");
      }

      setProcessedPhoto(payload.photos[0]);
      setStage("background");
      toast.success("Photo processed", { description: "Background removed successfully!" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Processing failed.";
      setError(msg);
      toast.error("Processing failed", { description: msg });
      setStage("review");
    }
  }

  // Apply background
  async function applyBackground(background: BackgroundOption) {
    if (!processedPhoto) return;
    setSelectedBackground(background);
    setError(null);

    try {
      const cutoutSrc = processedPhoto.previewUrl
        ? processedPhoto.previewUrl
        : withPreview(processedPhoto.cutoutUrl, PREVIEW_ASSET_WIDTH);
      const backgroundSrc =
        background.previewAsset ||
        withPreview(background.asset, PREVIEW_ASSET_WIDTH);

      const result = await composePreview(cutoutSrc, backgroundSrc, transform);
      setPreviewUrl(result.dataUrl);
      setTransform(result.transform);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not generate preview for that background.";
      setError(msg);
      toast.error("Preview failed", { description: msg });
    }
  }

  // Refresh preview with new transform
  async function refreshPreview(nextTransform: Transform) {
    if (!processedPhoto || !selectedBackground) return;

    try {
      const cutoutSrc = processedPhoto.previewUrl
        ? processedPhoto.previewUrl
        : withPreview(processedPhoto.cutoutUrl, PREVIEW_ASSET_WIDTH);
      const backgroundSrc =
        selectedBackground.previewAsset ||
        withPreview(selectedBackground.asset, PREVIEW_ASSET_WIDTH);

      const result = await composePreview(cutoutSrc, backgroundSrc, nextTransform);
      setPreviewUrl(result.dataUrl);
      setTransform(result.transform);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not refresh preview.";
      setError(msg);
    }
  }

  // Debounced transform update
  function handleTransformChange(key: keyof Transform, value: number) {
    const nextTransform = { ...transform, [key]: value };
    setTransform(nextTransform);

    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
    previewTimerRef.current = window.setTimeout(
      () => refreshPreview(nextTransform),
      90,
    );
  }

  // Send email
  async function sendEmail() {
    if (!email) {
      setError("Please enter an email address.");
      toast.error("Missing email", { description: "Please enter an email address." });
      return;
    }
    if (!processedPhoto || !selectedBackground || !previewUrl) {
      setError("Please select a background first.");
      toast.error("No background", { description: "Please select a background first." });
      return;
    }

    setStage("sending");
    setError(null);

    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: email,
          selections: [
            {
              photoId: processedPhoto.id,
              backgroundId: selectedBackground.id,
              transform,
              matchBackground: false,
            },
          ],
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to send email.");
      }

      setStage("sent");
      toast.success("Photo sent!", { description: "Check your email for your photo." });

      // Reset after 5 seconds
      setTimeout(() => {
        resetBooth();
      }, 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send email.";
      setError(msg);
      toast.error("Send failed", { description: msg });
      setStage("email");
    }
  }

  // Reset booth
  function resetBooth() {
    setCapturedImage(null);
    setProcessedPhoto(null);
    setPreviewUrl(null);
    setSelectedBackground(null);
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    setEmail("");
    setError(null);
    setCountdown(COUNTDOWN_SECONDS);
    setStage("setup");
  }

  return (
    <EventAccessGate>
      <div className="min-h-screen bg-background text-foreground relative">
        {(stage === "sending" || stage === "processing") && (
          <LoadingOverlay message={stage === "sending" ? "Sending your photo..." : "Processing your photo..."} />
        )}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(155,92,255,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(155,92,255,0.08),transparent_30%)]" />

        <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
          <PageHeader
            title="BoothOS Self-Service"
            description="Take your photo, choose a background, and get it sent to your email."
          />

          <StepIndicator steps={STEPS} currentStep={currentStepIndex} variant="compact" />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stage: Setup */}
          {stage === "setup" && (
            <Card className="p-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Let&apos;s get started!</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We&apos;ll need access to your camera to take your photo.
                  </p>
                </div>
                <Button variant="gradient" size="lg" onClick={setupCamera}>
                  <Camera className="size-5" />
                  Enable Camera
                </Button>
              </div>
            </Card>
          )}

          {/* Stage: Test */}
          {stage === "test" && (
            <Card className="p-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Camera Preview</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Make sure you&apos;re in frame and the lighting looks good.
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl bg-black ring-1 ring-border">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full"
                    style={{ transform: "scaleX(-1)" }}
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="gradient" onClick={() => setStage("ready")}>
                    <Check className="size-4" />
                    Looks Good
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      stopCamera();
                      setStage("setup");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Stage: Ready */}
          {stage === "ready" && (
            <Card className="p-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Ready to take your photo?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click the button when you&apos;re ready. We&apos;ll count down from {COUNTDOWN_SECONDS}.
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl bg-black ring-1 ring-border">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full"
                    style={{ transform: "scaleX(-1)" }}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={() => {
                      setCountdown(COUNTDOWN_SECONDS);
                      setStage("countdown");
                    }}
                  >
                    <Camera className="size-5" />
                    Take Photo
                  </Button>
                  <Button variant="secondary" onClick={() => setStage("test")}>
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Stage: Countdown */}
          {stage === "countdown" && (
            <Card className="p-8">
              <div className="space-y-6">
                <div className="overflow-hidden rounded-xl bg-black ring-1 ring-border">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full"
                    style={{ transform: "scaleX(-1)" }}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-9xl font-bold text-primary animate-pulse">
                    {countdown}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Stage: Flash */}
          {stage === "flash" && (
            <div className="fixed inset-0 z-50 bg-white" />
          )}

          {/* Stage: Review */}
          {stage === "review" && capturedImage && (
            <Card className="p-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">How does it look?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Happy with your photo? Let&apos;s process it and add a background.
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl bg-black ring-1 ring-border">
                  <Image
                    src={capturedImage}
                    alt="Captured photo"
                    width={1920}
                    height={1080}
                    unoptimized
                    className="w-full"
                    style={{ transform: "scaleX(-1)" }}
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="gradient" onClick={processPhoto}>
                    <Check className="size-4" />
                    Use This Photo
                  </Button>
                  <Button variant="secondary" onClick={retakePhoto}>
                    <RefreshCw className="size-4" />
                    Retake
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Stage: Background */}
          {stage === "background" && processedPhoto && (
            <Card className="p-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Choose a background</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Select from our collection of backgrounds.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
                  {/* Background Selection */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {backgrounds.map((bg) => (
                        <Button
                          key={bg.id}
                          onClick={() => applyBackground(bg)}
                          variant={selectedBackground?.id === bg.id ? "default" : "secondary"}
                          className="justify-start"
                        >
                          {bg.name}
                        </Button>
                      ))}
                    </div>

                    {/* Transform Controls */}
                    {selectedBackground && previewUrl && (
                      <div className="space-y-3 rounded-2xl bg-secondary p-4 ring-1 ring-border">
                        <p className="text-sm font-semibold">Adjust Position</p>
                        <div className="grid gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Scale</Label>
                            <input
                              type="range"
                              min="0.25"
                              max="2.5"
                              step="0.01"
                              value={transform.scale}
                              onChange={(e) =>
                                handleTransformChange("scale", parseFloat(e.target.value))
                              }
                              className="w-full accent-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Horizontal Position</Label>
                            <input
                              type="range"
                              min="-1500"
                              max="1500"
                              step="1"
                              value={transform.offsetX}
                              onChange={(e) =>
                                handleTransformChange("offsetX", parseFloat(e.target.value))
                              }
                              className="w-full accent-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Vertical Position</Label>
                            <input
                              type="range"
                              min="-1500"
                              max="1500"
                              step="1"
                              value={transform.offsetY}
                              onChange={(e) =>
                                handleTransformChange("offsetY", parseFloat(e.target.value))
                              }
                              className="w-full accent-primary"
                            />
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const reset: Transform = { scale: 1, offsetX: 0, offsetY: 0 };
                            setTransform(reset);
                            refreshPreview(reset);
                          }}
                        >
                          <RefreshCw className="size-4" />
                          Reset
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Preview
                    </p>
                    {previewUrl ? (
                      <div className="overflow-hidden rounded-xl ring-1 ring-border">
                        <Image
                          src={previewUrl}
                          alt="Preview with background"
                          width={1920}
                          height={1080}
                          unoptimized
                          className="w-full rounded-xl"
                          style={{ aspectRatio: "16/9", objectFit: "cover" }}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-secondary p-8 text-center text-sm text-muted-foreground">
                        Select a background to see preview
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="gradient"
                    onClick={() => setStage("email")}
                    disabled={!previewUrl}
                  >
                    <ArrowRight className="size-4" />
                    Continue to Email
                  </Button>
                  <Button variant="secondary" onClick={retakePhoto}>
                    <RefreshCw className="size-4" />
                    Start Over
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Stage: Email */}
          {stage === "email" && (
            <Card className="p-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Where should we send your photo?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Enter your email address to receive your photo.
                  </p>
                </div>

                {previewUrl && (
                  <div className="overflow-hidden rounded-xl ring-1 ring-border">
                    <Image
                      src={previewUrl}
                      alt="Final photo preview"
                      width={1920}
                      height={1080}
                      unoptimized
                      className="w-full rounded-xl"
                      style={{ aspectRatio: "16/9", objectFit: "cover" }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Your email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={sendEmail}
                    disabled={!email}
                  >
                    <Send className="size-5" />
                    Send My Photo
                  </Button>
                  <Button variant="secondary" onClick={() => setStage("background")}>
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Stage: Sent */}
          {stage === "sent" && (
            <Card className="p-8">
              <div className="space-y-6 text-center">
                <div>
                  <h2 className="text-2xl font-semibold">All done!</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Check your email for your photo. Thanks for using BoothOS!
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="flex size-24 items-center justify-center rounded-full bg-green-500/20">
                    <Check className="size-12 text-green-500" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Restarting in a few seconds...
                </p>
              </div>
            </Card>
          )}

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
        </main>
      </div>
    </EventAccessGate>
  );
}
