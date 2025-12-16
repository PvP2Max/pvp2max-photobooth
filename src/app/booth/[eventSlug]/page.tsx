"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { BackgroundOption } from "@/lib/backgrounds";
import EventAccessGate from "../../event-access";

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
  const [message, setMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewTimerRef = useRef<number | null>(null);

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Processing failed.";
      setError(msg);
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
      return;
    }
    if (!processedPhoto || !selectedBackground || !previewUrl) {
      setError("Please select a background first.");
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
      setMessage("Your photo has been sent! Check your email.");

      // Reset after 5 seconds
      setTimeout(() => {
        resetBooth();
      }, 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send email.";
      setError(msg);
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
    setMessage(null);
    setCountdown(COUNTDOWN_SECONDS);
    setStage("setup");
  }

  return (
    <EventAccessGate>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(155,92,255,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(155,92,255,0.08),transparent_30%)]" />

        <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">BoothOS Self-Service</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Take your photo, choose a background, and get it sent to your email.
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

          {/* Stage: Setup */}
          {stage === "setup" && (
            <section className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Let&apos;s get started!</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    We&apos;ll need access to your camera to take your photo.
                  </p>
                </div>
                <button
                  onClick={setupCamera}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-lime-300 px-6 py-3 text-base font-semibold text-slate-950 transition hover:from-emerald-300 hover:to-lime-200"
                >
                  Enable Camera
                </button>
              </div>
            </section>
          )}

          {/* Stage: Test */}
          {stage === "test" && (
            <section className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Camera Preview</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Make sure you&apos;re in frame and the lighting looks good.
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
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
                  <button
                    onClick={() => setStage("ready")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-lime-300 px-6 py-3 text-base font-semibold text-slate-950 transition hover:from-emerald-300 hover:to-lime-200"
                  >
                    Looks Good
                  </button>
                  <button
                    onClick={() => {
                      stopCamera();
                      setStage("setup");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Stage: Ready */}
          {stage === "ready" && (
            <section className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Ready to take your photo?</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Click the button when you&apos;re ready. We&apos;ll count down from {COUNTDOWN_SECONDS}.
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
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
                  <button
                    onClick={() => {
                      setCountdown(COUNTDOWN_SECONDS);
                      setStage("countdown");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-400 px-6 py-3 text-base font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-pink-300"
                  >
                    Take Photo
                  </button>
                  <button
                    onClick={() => setStage("test")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
                  >
                    Back
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Stage: Countdown */}
          {stage === "countdown" && (
            <section className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="space-y-6">
                <div className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
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
                  <div className="text-9xl font-bold text-emerald-400">
                    {countdown}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Stage: Flash */}
          {stage === "flash" && (
            <div className="fixed inset-0 z-50 bg-white" />
          )}

          {/* Stage: Review */}
          {stage === "review" && capturedImage && (
            <section className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">How does it look?</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Happy with your photo? Let&apos;s process it and add a background.
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
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
                  <button
                    onClick={processPhoto}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-lime-300 px-6 py-3 text-base font-semibold text-slate-950 transition hover:from-emerald-300 hover:to-lime-200"
                  >
                    Use This Photo
                  </button>
                  <button
                    onClick={retakePhoto}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
                  >
                    Retake
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Stage: Processing */}
          {stage === "processing" && (
            <section className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="space-y-6 text-center">
                <div>
                  <h2 className="text-2xl font-semibold">Processing your photo...</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Removing the background and preparing your image.
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent" />
                </div>
              </div>
            </section>
          )}

          {/* Stage: Background */}
          {stage === "background" && processedPhoto && (
            <section className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Choose a background</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Select from our collection of backgrounds.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
                  {/* Background Selection */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {backgrounds.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => applyBackground(bg)}
                          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                            selectedBackground?.id === bg.id
                              ? "border-cyan-300 bg-cyan-400/10 text-cyan-100"
                              : "border-white/10 bg-white/5 text-slate-200 hover:border-white/30"
                          }`}
                        >
                          {bg.name}
                        </button>
                      ))}
                    </div>

                    {/* Transform Controls */}
                    {selectedBackground && previewUrl && (
                      <div className="space-y-3 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-white/5">
                        <p className="text-sm font-semibold text-white">Adjust Position</p>
                        <div className="grid gap-3">
                          <label className="text-xs text-slate-300/80">
                            Scale
                            <input
                              type="range"
                              min="0.25"
                              max="2.5"
                              step="0.01"
                              value={transform.scale}
                              onChange={(e) =>
                                handleTransformChange("scale", parseFloat(e.target.value))
                              }
                              className="mt-1 w-full"
                            />
                          </label>
                          <label className="text-xs text-slate-300/80">
                            Horizontal Position
                            <input
                              type="range"
                              min="-1500"
                              max="1500"
                              step="1"
                              value={transform.offsetX}
                              onChange={(e) =>
                                handleTransformChange("offsetX", parseFloat(e.target.value))
                              }
                              className="mt-1 w-full"
                            />
                          </label>
                          <label className="text-xs text-slate-300/80">
                            Vertical Position
                            <input
                              type="range"
                              min="-1500"
                              max="1500"
                              step="1"
                              value={transform.offsetY}
                              onChange={(e) =>
                                handleTransformChange("offsetY", parseFloat(e.target.value))
                              }
                              className="mt-1 w-full"
                            />
                          </label>
                        </div>
                        <button
                          onClick={() => {
                            const reset: Transform = { scale: 1, offsetX: 0, offsetY: 0 };
                            setTransform(reset);
                            refreshPreview(reset);
                          }}
                          className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15 hover:bg-white/15"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wide text-slate-300">
                      Preview
                    </p>
                    {previewUrl ? (
                      <div className="overflow-hidden rounded-xl ring-1 ring-white/5">
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
                      <div className="rounded-xl border border-dashed border-white/10 bg-black/30 p-8 text-center text-sm text-slate-300">
                        Select a background to see preview
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStage("email")}
                    disabled={!previewUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-lime-300 px-6 py-3 text-base font-semibold text-slate-950 transition hover:from-emerald-300 hover:to-lime-200 disabled:opacity-50"
                  >
                    Continue to Email
                  </button>
                  <button
                    onClick={retakePhoto}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Stage: Email */}
          {stage === "email" && (
            <section className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Where should we send your photo?</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Enter your email address to receive your photo.
                  </p>
                </div>

                {previewUrl && (
                  <div className="overflow-hidden rounded-xl ring-1 ring-white/5">
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

                <label className="text-sm text-slate-200/80">
                  Your email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none"
                  />
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={sendEmail}
                    disabled={!email}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-400 to-cyan-300 px-6 py-3 text-base font-semibold text-slate-950 transition hover:from-pink-300 hover:to-cyan-200 disabled:opacity-50"
                  >
                    Send My Photo
                  </button>
                  <button
                    onClick={() => setStage("background")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
                  >
                    Back
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Stage: Sending */}
          {stage === "sending" && (
            <section className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="space-y-6 text-center">
                <div>
                  <h2 className="text-2xl font-semibold">Sending your photo...</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    This will only take a moment.
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-pink-400 border-t-transparent" />
                </div>
              </div>
            </section>
          )}

          {/* Stage: Sent */}
          {stage === "sent" && (
            <section className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="space-y-6 text-center">
                <div>
                  <h2 className="text-2xl font-semibold">All done!</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Check your email for your photo. Thanks for using BoothOS!
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <svg
                    className="h-24 w-24 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-slate-300">
                  Restarting in a few seconds...
                </p>
              </div>
            </section>
          )}

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
        </main>
      </div>
    </EventAccessGate>
  );
}
