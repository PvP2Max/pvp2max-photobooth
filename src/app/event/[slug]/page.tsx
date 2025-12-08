"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type SessionResponse = {
  business: { id: string; name: string; slug: string };
  event: {
    id: string;
    name: string;
    slug: string;
    plan?: string;
    allowBackgroundRemoval?: boolean;
    allowAiBackgrounds?: boolean;
    allowAiFilters?: boolean;
    overlaysAll?: boolean;
    premiumFilters?: boolean;
    watermarkEnabled?: boolean;
    smsEnabled?: boolean;
    mode?: "self-serve" | "photographer";
    paymentStatus?: "unpaid" | "pending" | "paid";
    overlayTheme?: string;
  };
};

type Usage = {
  photoCap: number | null;
  photoUsed: number;
  remainingPhotos: number | null;
  aiCredits: number;
  aiUsed: number;
  remainingAi: number;
};

const FILTERS = [
  { id: "none", label: "Clean", filter: "none" },
  { id: "bw", label: "B&W", filter: "grayscale(1)" },
  { id: "warm", label: "Warm Glow", filter: "contrast(1.05) saturate(1.1) sepia(0.12)" },
  { id: "cool", label: "Cool", filter: "saturate(0.95) hue-rotate(-8deg)" },
  { id: "matte", label: "Matte", filter: "saturate(0.9) brightness(0.97) contrast(0.96)" },
  { id: "soft", label: "Soft Skin", filter: "blur(0px) brightness(1.04) contrast(0.98)" },
];

const PREMIUM_FILTERS = [
  { id: "vintage", label: "Vintage Film", filter: "sepia(0.35) contrast(1.05) saturate(0.9)" },
  { id: "glam", label: "Glam", filter: "contrast(1.15) saturate(1.12) brightness(1.05)" },
  { id: "neon", label: "Neon", filter: "saturate(1.4) hue-rotate(12deg) contrast(1.1)" },
  { id: "dramatic", label: "Dramatic", filter: "contrast(1.2) saturate(1.15)" },
  { id: "cinematic", label: "Cinematic", filter: "saturate(1.1) contrast(1.12) brightness(0.98)" },
  { id: "noir", label: "Noir", filter: "grayscale(1) contrast(1.25) brightness(0.9)" },
];

export default function BoothPage({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams();
  const businessSlug = searchParams.get("business") ?? "";
  const eventSlug = params.slug;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [filter, setFilter] = useState(FILTERS[0].id);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [useAiBackground, setUseAiBackground] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [planFeatures, setPlanFeatures] = useState<{
    allowAiBackgrounds: boolean;
    premiumFilters: boolean;
  }>({ allowAiBackgrounds: false, premiumFilters: false });

  const activeFilter = useMemo(() => FILTERS.find((f) => f.id === filter)?.filter || "none", [filter]);
  const availableFilters = useMemo(() => {
    if (planFeatures.premiumFilters) return [...FILTERS, ...PREMIUM_FILTERS];
    return FILTERS;
  }, [planFeatures.premiumFilters]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1600 }, height: { ideal: 900 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setError("Camera unavailable. Check permissions.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    const videoEl = videoRef.current;
    // Hide global nav while in booth mode
    const header = document.querySelector("header");
    if (header) (header as HTMLElement).style.display = "none";
    return () => {
      const tracks = (videoEl?.srcObject as MediaStream | null)?.getTracks() || [];
      tracks.forEach((t) => t.stop());
      if (header) (header as HTMLElement).style.display = "";
    };
  }, [startCamera]);

  const attemptAutoUnlock = useCallback(async () => {
    if (!businessSlug || !eventSlug) return;
    try {
      await fetch("/api/auth/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ businessSlug, eventSlug }),
      });
    } catch {
      // ignore
    }
  }, [businessSlug, eventSlug]);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/event", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as SessionResponse;
        setSession(data);
        setRemoveBackground(data.event.allowBackgroundRemoval ?? true);
        setPlanFeatures({
          allowAiBackgrounds: data.event.allowAiBackgrounds ?? false,
          premiumFilters: data.event.premiumFilters ?? false,
        });
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    void attemptAutoUnlock().then(() => loadSession());
  }, [attemptAutoUnlock, loadSession]);

  function drawFrameToCanvas() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const side = Math.min(video.videoWidth || 1280, video.videoHeight || 720) || 720;
    // Square crop to keep 1:1 for frames/AI backgrounds
    canvas.width = side;
    canvas.height = side;
    const sx = ((video.videoWidth || side) - side) / 2;
    const sy = ((video.videoHeight || side) - side) / 2;
    ctx.filter = "none";
    ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);
    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl;
  }

  function startCountdownAndCapture() {
    if (!cameraReady) {
      setError("Camera not ready yet.");
      return;
    }
    setError(null);
    setStatus("Get ready...");
    let counter = 3;
    setCountdown(counter);
    const timer = setInterval(() => {
      counter -= 1;
      if (counter <= 0) {
        clearInterval(timer);
        setCountdown(null);
        const dataUrl = drawFrameToCanvas();
        if (dataUrl) {
          setCaptured(dataUrl);
          setStatus("Review your shot");
        } else {
          setError("Failed to capture image.");
        }
      } else {
        setCountdown(counter);
      }
    }, 700);
  }

  function resetCapture() {
    setCaptured(null);
    setStatus(null);
    setError(null);
  }

  async function handleSend() {
    if (!captured) {
      setError("Take a photo first.");
      return;
    }
    if (!email) {
      setError("Enter an email to deliver the photo.");
      return;
    }
    if (usage?.remainingPhotos === 0) {
      setError("Photo limit reached. Upgrade to continue.");
      return;
    }
    setSending(true);
    setError(null);
    setStatus("Uploading...");
    try {
      const blob = await fetch(captured).then((r) => r.blob());
      const file = new File([blob], "booth-capture.png", { type: "image/png" });
      const form = new FormData();
      form.append("email", email);
      form.append("file", file);
      form.append("removeBackground", removeBackground ? "true" : "false");
      form.append("booth", "1");
      form.append("filter", filter);
      if (useAiBackground && aiPrompt) {
        form.append("aiPrompt", aiPrompt);
      }
      const res = await fetch("/api/photos", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        usage?: Usage;
      };
      if (!res.ok) {
        setError(payload.error || "Failed to send photo.");
        return;
      }
      setUsage(payload.usage ?? null);
      setStatus("Sent! Check your email.");
    } catch {
      setError("Upload failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-soft)]">
              BoothOS Live Booth
            </p>
            <h1 className="text-3xl font-semibold">
              {session?.event?.name || "Event"}{" "}
              <span className="text-[var(--color-text-muted)]">/ {eventSlug}</span>
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Business: {session?.business?.slug || businessSlug || "Unknown"} • Plan:{" "}
              {session?.event?.plan ?? "event-basic"} • Mode: {session?.event?.mode ?? "self-serve"}
              {session?.event?.paymentStatus && ` • Payment: ${session.event.paymentStatus}`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            {usage && (
              <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 ring-1 ring-[var(--color-border-subtle)]">
                Photos used: {usage.photoUsed}
                {usage.photoCap !== null ? ` / ${usage.photoCap}` : " (unlimited)"}
              </span>
            )}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
              {!captured ? (
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  style={{ filter: activeFilter }}
                  playsInline
                  muted
                />
              ) : (
                <img
                  src={captured}
                  alt="Captured preview"
                  className="h-full w-full object-cover"
                  style={{ filter: activeFilter }}
                />
              )}
              {countdown && (
                <div className="absolute inset-0 flex items-center justify-center text-6xl font-semibold text-white drop-shadow-lg">
                  {countdown}
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!captured ? (
                <button
                  onClick={startCountdownAndCapture}
                  className="rounded-full bg-[var(--gradient-brand)] px-5 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)]"
                >
                  {cameraReady ? "Take photo" : "Loading camera..."}
                </button>
              ) : (
                <button
                  onClick={resetCapture}
                  className="rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                >
                  Retake
                </button>
              )}
              <div className="flex flex-wrap gap-2">
                {availableFilters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-full px-3 py-1 text-xs ring-1 ${
                      filter === f.id
                        ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] ring-[var(--color-primary)]"
                        : "bg-[var(--color-surface-elevated)] text-[var(--color-text)] ring-[var(--color-border-subtle)]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold">Delivery</h2>
            {status && (
              <div className="rounded-xl bg-[var(--color-success-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]">
                {status}
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]">
                {error}
              </div>
            )}
            {usage?.remainingPhotos === 0 && (
              <div className="rounded-xl bg-[var(--color-warning-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(251,191,36,0.35)]">
                Photo limit reached for this event. Upgrade or top up to continue.
              </div>
            )}
            <label className="block text-sm text-[var(--color-text-muted)]">
              Guest email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@example.com"
                className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={removeBackground}
                  onChange={(e) => setRemoveBackground(e.target.checked)}
                />
                Background removal
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useAiBackground}
                  onChange={(e) => setUseAiBackground(e.target.checked)}
                  disabled={!planFeatures.allowAiBackgrounds || (usage?.remainingAi ?? 0) <= 0}
                />
                AI background (credits)
              </label>
            </div>
            {useAiBackground && (
              <label className="block text-sm text-[var(--color-text-muted)]">
                AI prompt
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., snowy mountain at night"
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-[var(--color-text-soft)]">
                  Tip: Ask for 1:1 photobooth backgrounds. If you request text on frames, AI may mis-spell—review before use.
                </p>
              </label>
            )}
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full rounded-xl bg-[var(--gradient-brand)] px-4 py-3 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)] disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send photo"}
            </button>
            <p className="text-xs text-[var(--color-text-muted)]">
              Photos and credits are tracked per event. AI backgrounds consume credits when enabled.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
