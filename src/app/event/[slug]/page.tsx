"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Camera, Check, RefreshCw, Send, Mail } from "lucide-react";
import { toast } from "sonner";
import type { BackgroundOption } from "@/lib/backgrounds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner, LoadingOverlay } from "@/components/ui/loading-spinner";
import { StepIndicator } from "@/components/ui/step-indicator";
import { cn } from "@/lib/utils";

type SessionResponse = {
  business: { id: string; name: string; slug: string };
  event: {
    id: string;
    name: string;
    slug: string;
    mode?: "self-serve" | "photographer";
    plan?: string;
    allowedSelections?: number;
    allowBackgroundRemoval?: boolean;
    paymentStatus?: "unpaid" | "pending" | "paid";
  };
};

type UploadPhoto = {
  id: string;
  cutoutUrl: string;
  previewUrl?: string;
  originalUrl?: string;
};

type BoothStage = "intro" | "live" | "countdown" | "review" | "processing" | "select" | "sent";

const STEPS = [
  { id: "capture", label: "Capture" },
  { id: "process", label: "Process" },
  { id: "select", label: "Select" },
  { id: "send", label: "Send" },
];

function getStepIndex(stage: BoothStage): number {
  if (["intro", "live", "countdown", "review"].includes(stage)) return 0;
  if (stage === "processing") return 1;
  if (stage === "select") return 2;
  return 3;
}

function dataUrlToFile(dataUrl: string, name: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) throw new Error("Invalid capture data");
  const [, mime, data] = match;
  const buffer = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  return new File([buffer], name, { type: mime || "image/png" });
}

export default function BoothPage() {
  const searchParams = useSearchParams();
  const params = useParams<{ slug: string }>();
  const businessSlug = searchParams.get("business") ?? "";
  const eventSlug = params?.slug ?? "";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stage, setStage] = useState<BoothStage>("intro");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([]);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<Set<string>>(new Set());
  const [loadingBackgrounds, setLoadingBackgrounds] = useState(false);
  const businessParam = useMemo(
    () => businessSlug || searchParams.get("business") || "",
    [businessSlug, searchParams],
  );
  const eventParam = eventSlug;
  const resolvedBusiness = businessParam;
  const selectionLimit = session?.event?.allowedSelections ?? 1;

  const activeBackground = useMemo(() => {
    const selected = [...selectedBackgrounds][0];
    if (selected) return backgrounds.find((bg) => bg.id === selected) || backgrounds[0];
    return backgrounds[0];
  }, [backgrounds, selectedBackgrounds]);
  const businessLabel = session?.business?.slug ?? resolvedBusiness ?? "Unknown";
  const modeLabel = session?.event?.mode ?? "self-serve";
  const currentStepIndex = getStepIndex(stage);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError("Camera unavailable. Check permissions and reload.");
      toast.error("Camera error", { description: "Check permissions and reload." });
    }
  }, []);

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    const header = document.querySelector("header");
    if (header) (header as HTMLElement).style.display = "none";
    return () => {
      stopCamera();
      if (header) (header as HTMLElement).style.display = "";
    };
  }, [stopCamera]);

  const loadSession = useCallback(async () => {
    try {
      if (!resolvedBusiness || !eventParam) {
        setSession(null);
        setError("Missing event link details.");
        return;
      }
      const qs = new URLSearchParams({
        business: resolvedBusiness,
        event: eventParam,
      });
      const qsString = qs.toString();
      const res = await fetch(`/api/auth/event?${qsString}`, { credentials: "include" });
      if (!res.ok) {
        setSession(null);
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setError(payload.error || "Event not found or unavailable.");
        return;
      }
      const data = (await res.json()) as SessionResponse;
      setSession(data);
      setError(null);
    } catch {
      setSession(null);
      setError("Unable to load event details.");
    }
  }, [resolvedBusiness, eventParam]);

  const loadBackgrounds = useCallback(async () => {
    setLoadingBackgrounds(true);
    try {
      const res = await fetch(`/api/backgrounds?event=${encodeURIComponent(eventParam)}`, {
        headers: { "x-boothos-event": eventParam },
        credentials: "include",
      });
      const payload = (await res.json().catch(() => ({}))) as { backgrounds?: BackgroundOption[] };
      if (res.ok && Array.isArray(payload.backgrounds)) {
        setBackgrounds(payload.backgrounds);
        if (payload.backgrounds.length === 1) {
          setSelectedBackgrounds(new Set([payload.backgrounds[0].id]));
        }
      }
    } catch {
      // surface via error panel on demand
    } finally {
      setLoadingBackgrounds(false);
    }
  }, [eventParam]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (session) {
      void loadBackgrounds();
    }
  }, [session, loadBackgrounds]);

  function drawFrameToCanvas() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Calculate square crop from video center
    const videoSide = Math.min(video.videoWidth || 1280, video.videoHeight || 720);
    const sx = ((video.videoWidth || videoSide) - videoSide) / 2;
    const sy = ((video.videoHeight || videoSide) - videoSide) / 2;

    // Limit output size to reduce upload size (max 1024px for faster uploads)
    const maxSize = 1024;
    const outputSide = Math.min(videoSide, maxSize);
    canvas.width = outputSide;
    canvas.height = outputSide;

    ctx.filter = "none";
    ctx.drawImage(video, sx, sy, videoSide, videoSide, 0, 0, outputSide, outputSide);

    // Use JPEG at 85% quality (~200-400KB vs 2-5MB for PNG)
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  function beginCountdown() {
    setError(null);
    setStage("countdown");
    let counter = 3;
    setCountdown(counter);
    const timer = setInterval(() => {
      counter -= 1;
      if (counter <= 0) {
        clearInterval(timer);
        setCountdown(null);
        const frame = drawFrameToCanvas();
        if (frame) {
          setCaptured(frame);
          setStage("review");
          setStatus("Review your shot");
        } else {
          setError("Failed to capture image.");
          setStage("live");
        }
      } else {
        setCountdown(counter);
      }
    }, 750);
  }

  function handleStart() {
    setStage("live");
    setCaptured(null);
    setCutoutUrl(null);
    setPhotoId(null);
    setStatus("Tap anywhere to snap your photo");
    void startCamera();
  }

  function handleRetake() {
    setCaptured(null);
    setCutoutUrl(null);
    setPhotoId(null);
    setStatus("Tap anywhere to snap your photo");
    setStage("live");
  }

  function toggleBackground(id: string) {
    setSelectedBackgrounds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (selectionLimit && next.size >= selectionLimit) {
        toast.warning("Selection limit reached", {
          description: `You can pick up to ${selectionLimit} background${selectionLimit > 1 ? "s" : ""}.`,
        });
        return prev;
      }
      next.add(id);
      return next;
    });
  }

  async function processCutout() {
    if (!captured) {
      setError("Take a photo first.");
      return;
    }
    if (!email.trim()) {
      setError("Enter an email before continuing.");
      toast.error("Missing email", { description: "Enter an email before continuing." });
      return;
    }
    setProcessing(true);
    setStage("processing");
    setStatus("Sending to MODNet…");
    setError(null);
    try {
      const file = dataUrlToFile(captured, "booth-capture.jpg");
      const form = new FormData();
      form.append("email", email.trim());
      form.append("file", file);
      form.append("booth", "1");
      form.append("removeBackground", "true");
      const res = await fetch(`/api/photos?event=${encodeURIComponent(eventParam)}`, {
        method: "POST",
        headers: {
          "x-boothos-event": eventParam,
        },
        body: form,
        credentials: "include",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        photos?: UploadPhoto[];
        error?: string;
      };
      if (!res.ok || !payload.photos?.length) {
        throw new Error(payload.error || "Background removal failed.");
      }
      const photo = payload.photos[0];
      const preview = photo.previewUrl || photo.cutoutUrl || photo.originalUrl;
      if (!preview) {
        throw new Error("MODNet returned without a preview.");
      }
      setPhotoId(photo.id);
      setCutoutUrl(preview);
      setStatus("Background removed. Choose your background.");
      setStage("select");
      toast.success("Photo processed", { description: "Background removed successfully!" });
      if (backgrounds.length === 1 && selectedBackgrounds.size === 0) {
        setSelectedBackgrounds(new Set([backgrounds[0].id]));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process photo.";
      setError(message);
      toast.error("Processing failed", { description: message });
      setStage("review");
    } finally {
      setProcessing(false);
    }
  }

  async function sendEmail() {
    if (!photoId || !cutoutUrl) {
      setError("Process your photo before sending.");
      return;
    }
    const chosen =
      selectedBackgrounds.size > 0
        ? [...selectedBackgrounds]
        : backgrounds.length === 1
          ? [backgrounds[0].id]
          : [];
    if (chosen.length === 0) {
      setError("Choose at least one background.");
      toast.error("No background selected", { description: "Choose at least one background." });
      return;
    }
    if (!email.trim()) {
      setError("Enter an email to deliver the photos.");
      return;
    }
    setSending(true);
    setStatus("Sending your photos…");
    setError(null);
    try {
      const body = {
        clientEmail: email.trim(),
        selections: chosen.map((backgroundId) => ({
          photoId,
          backgroundId,
        })),
      };
      const res = await fetch(`/api/email?event=${encodeURIComponent(eventParam)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-boothos-event": eventParam,
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Failed to send email.");
      }
      setStatus("Sent! Check your email for the download link.");
      setStage("sent");
      toast.success("Photos sent!", { description: "Check your email for the download link." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send right now.";
      setError(message);
      toast.error("Send failed", { description: message });
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      {processing && <LoadingOverlay message="Processing your photo..." />}
      {sending && <LoadingOverlay message="Sending your photos..." />}

      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(155,92,255,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(155,92,255,0.08),transparent_30%)]" />

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">BoothOS Self-Serve</p>
            <h1 className="text-2xl font-semibold">
              {session?.event?.name ?? "Event"}{" "}
              <span className="text-muted-foreground">/ {eventSlug}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Business: {businessLabel} • Mode: {modeLabel}{" "}
              {session?.event?.paymentStatus && (
                <Badge variant="secondary" className="ml-2">
                  {session.event.paymentStatus}
                </Badge>
              )}
            </p>
          </div>
          {status && (
            <Badge variant="secondary" className="text-sm">
              {status}
            </Badge>
          )}
        </div>

        {/* Step Indicator */}
        <StepIndicator steps={STEPS} currentStep={currentStepIndex} variant="compact" />

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Camera/Preview Area */}
          <Card className="overflow-hidden">
            <div className="relative aspect-[3/4] bg-secondary">
              {!captured && (
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  playsInline
                  muted
                />
              )}
              {captured && stage !== "processing" && stage !== "select" && (
                <img
                  src={captured}
                  alt="Captured preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {(stage === "processing" || stage === "select" || stage === "sent") && activeBackground && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${activeBackground.previewAsset || activeBackground.asset})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: stage === "processing" ? "blur(4px)" : "none",
                    transform: "scale(1.01)",
                  }}
                />
              )}
              {(stage === "processing" || stage === "select" || stage === "sent") && cutoutUrl && (
                <img
                  src={cutoutUrl}
                  alt="Cutout preview"
                  className="absolute inset-0 m-auto max-h-full max-w-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                />
              )}

              {/* Intro Overlay */}
              {stage === "intro" && (
                <button
                  onClick={handleStart}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-center text-white backdrop-blur-sm transition hover:bg-black/50"
                >
                  <Camera className="size-12 text-primary" />
                  <span className="text-xs uppercase tracking-[0.3em] text-white/70">Booth ready</span>
                  <span className="text-2xl font-semibold">Tap to start</span>
                </button>
              )}

              {/* Live/Countdown Overlay */}
              {(stage === "live" || stage === "countdown") && (
                <button
                  onClick={beginCountdown}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 text-center text-white transition hover:bg-black/20"
                >
                  {countdown ? (
                    <div className="text-9xl font-bold text-primary animate-pulse">
                      {countdown}
                    </div>
                  ) : (
                    <div className="rounded-full bg-black/50 px-6 py-3 text-lg font-semibold backdrop-blur-sm">
                      Tap to snap your photo
                    </div>
                  )}
                </button>
              )}

              {/* Review Overlay */}
              {stage === "review" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    Looks good?
                  </Badge>
                </div>
              )}

              {/* Sent Overlay */}
              {stage === "sent" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-green-500/20">
                    <Check className="size-8 text-green-500" />
                  </div>
                  <p className="text-lg font-semibold text-white">Delivered!</p>
                  <p className="text-sm text-white/80">Check your inbox for the download link.</p>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>
          </Card>

          {/* Controls Panel */}
          <div className="flex flex-col gap-4">
            {/* Status Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Steps</CardTitle>
                  {(stage === "review" || stage === "select" || stage === "sent") && (
                    <Button variant="secondary" size="sm" onClick={handleRetake}>
                      <RefreshCw className="size-4" />
                      Retake
                    </Button>
                  )}
                </div>
                <CardDescription>
                  {stage === "intro" && "Tap to start the booth"}
                  {stage === "live" && "Tap anywhere to start the countdown"}
                  {stage === "countdown" && "Hold still… capturing next"}
                  {stage === "review" && "Retake or continue to background removal"}
                  {stage === "processing" && "Processing with MODNet"}
                  {stage === "select" && "Pick your background(s) then send"}
                  {stage === "sent" && "Delivered — start another?"}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Email Input */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="guest-email" className="flex items-center gap-2">
                    <Mail className="size-4" />
                    Guest email
                  </Label>
                  <Input
                    id="guest-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guest@example.com"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We&apos;ll send the finished photo(s) as a single download link.
                </p>
              </CardContent>
            </Card>

            {/* Review Actions */}
            {stage === "review" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Happy with this photo?</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={handleRetake}>
                    <RefreshCw className="size-4" />
                    Retake
                  </Button>
                  <Button
                    variant="gradient"
                    onClick={processCutout}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        Looks good — continue
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Background Selection */}
            {(stage === "select" || stage === "sent") && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Choose background</CardTitle>
                    {selectionLimit ? (
                      <Badge variant="secondary">
                        Up to {selectionLimit}
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingBackgrounds && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <LoadingSpinner size="sm" />
                      Loading backgrounds…
                    </div>
                  )}
                  {!loadingBackgrounds && backgrounds.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No backgrounds configured. Ask the host to enable them.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {backgrounds.map((bg) => {
                      const selected = selectedBackgrounds.has(bg.id);
                      return (
                        <button
                          key={bg.id}
                          onClick={() => toggleBackground(bg.id)}
                          className={cn(
                            "group overflow-hidden rounded-xl text-left transition ring-1",
                            selected
                              ? "ring-2 ring-primary bg-primary/10 shadow-lg shadow-primary/20"
                              : "ring-border bg-secondary hover:ring-primary/50"
                          )}
                        >
                          <div
                            className="aspect-video w-full bg-secondary"
                            style={{
                              backgroundImage: `url(${bg.previewAsset || bg.asset})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          />
                          <div className="flex items-center justify-between px-3 py-2">
                            <div>
                              <p className="text-sm font-semibold">{bg.name}</p>
                              <p className="text-xs text-muted-foreground">{bg.category || "background"}</p>
                            </div>
                            <span
                              className={cn(
                                "size-5 rounded-full border-2 transition",
                                selected
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground bg-transparent"
                              )}
                              aria-hidden
                            >
                              {selected && <Check className="size-full p-0.5 text-primary-foreground" />}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Send Button */}
            {stage === "select" && (
              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={sendEmail}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Send to guest
                  </>
                )}
              </Button>
            )}

            {/* Sent State */}
            {stage === "sent" && (
              <div className="space-y-3">
                <Alert className="bg-green-500/10 border-green-500/30">
                  <Check className="size-4 text-green-500" />
                  <AlertDescription className="text-green-100">
                    Sent! We&apos;ll deliver a single download link with the selected backgrounds.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={handleRetake}
                >
                  <RefreshCw className="size-4" />
                  Start another
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
