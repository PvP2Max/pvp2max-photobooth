"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { BackgroundOption } from "@/lib/backgrounds";

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
  const [needsLogin, setNeedsLogin] = useState(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([]);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<Set<string>>(new Set());
  const [loadingBackgrounds, setLoadingBackgrounds] = useState(false);
  const [businessSession, setBusinessSession] = useState<{ slug: string } | null>(null);
  const [businessChecked, setBusinessChecked] = useState(false);

  const businessParam = useMemo(
    () => businessSlug || searchParams.get("business") || "",
    [businessSlug, searchParams],
  );
  const eventParam = eventSlug;
  const resolvedBusiness = businessParam || businessSession?.slug || "";
  const selectionLimit = session?.event?.allowedSelections ?? 1;

  const activeBackground = useMemo(() => {
    const selected = [...selectedBackgrounds][0];
    if (selected) return backgrounds.find((bg) => bg.id === selected) || backgrounds[0];
    return backgrounds[0];
  }, [backgrounds, selectedBackgrounds]);
  const businessLabel = session?.business?.slug ?? resolvedBusiness ?? "Unknown";
  const modeLabel = session?.event?.mode ?? "self-serve";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/business", { credentials: "include" });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { business?: { slug?: string } };
          if (data.business?.slug) {
            setBusinessSession({ slug: data.business.slug });
          }
        }
      } catch {
        // ignore; kiosk links may rely solely on event keys
      } finally {
        if (!cancelled) setBusinessChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!businessChecked) return;
    try {
      if (!resolvedBusiness || !eventParam) {
        setSession(null);
        setNeedsLogin(true);
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
        setNeedsLogin(true);
        return;
      }
      const data = (await res.json()) as SessionResponse;
      setSession(data);
      setNeedsLogin(false);
    } catch {
      setSession(null);
      setNeedsLogin(true);
    }
  }, [resolvedBusiness, eventParam, businessChecked]);

  const loadBackgrounds = useCallback(async () => {
    setLoadingBackgrounds(true);
    try {
      const res = await fetch("/api/backgrounds", { credentials: "include" });
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
  }, []);

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
    const side =
      Math.min(video.videoWidth || 1280, video.videoHeight || 720) || video.videoWidth || 1080;
    canvas.width = side;
    canvas.height = side;
    const sx = ((video.videoWidth || side) - side) / 2;
    const sy = ((video.videoHeight || side) - side) / 2;
    ctx.filter = "none";
    ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);
    return canvas.toDataURL("image/png");
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
        setStatus(`You can pick up to ${selectionLimit} background${selectionLimit > 1 ? "s" : ""}.`);
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
      return;
    }
    setProcessing(true);
    setStage("processing");
    setStatus("Sending to MODNet…");
    setError(null);
    try {
      const file = dataUrlToFile(captured, "booth-capture.png");
      const form = new FormData();
      form.append("email", email.trim());
      form.append("file", file);
      form.append("booth", "1");
      form.append("removeBackground", "true");
      const res = await fetch("/api/photos", {
        method: "POST",
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
      if (backgrounds.length === 1 && selectedBackgrounds.size === 0) {
        setSelectedBackgrounds(new Set([backgrounds[0].id]));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process photo.";
      setError(message);
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
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Failed to send email.");
      }
      setStatus("Sent! Check your email for the download link.");
      setStage("sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send right now.";
      setError(message);
    } finally {
      setSending(false);
    }
  }

  const nextParam =
    typeof window !== "undefined"
      ? encodeURIComponent(`${window.location.pathname}${window.location.search}`)
      : "";
  const loginHref = nextParam ? `/login?next=${nextParam}` : "/login";

  if (needsLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6 text-[var(--color-text)]">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-[var(--color-surface)] p-6 text-center ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
          <h1 className="text-xl font-semibold">Sign in to access this event</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Please sign in to the business account to unlock this event. After login you will be redirected
            back here automatically.
          </p>
          <a
            href={loginHref}
            className="block w-full rounded-full bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
          >
            Go to login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#05060a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(120,119,198,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.12),transparent_30%),linear-gradient(180deg,rgba(10,12,18,0.9),rgba(10,12,18,0.96))]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">BoothOS Self-Serve</p>
            <h1 className="text-2xl font-semibold">
              {session?.event?.name ?? "Event"}{" "}
              <span className="text-white/60">/ {eventSlug}</span>
            </h1>
            <p className="text-sm text-white/60">
              Business: {businessLabel} • Mode: {modeLabel}{" "}
              {session?.event?.paymentStatus && `• Payment: ${session.event.paymentStatus}`}
            </p>
          </div>
          {status && (
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15">
              {status}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-100 ring-1 ring-red-500/30">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d111b] to-[#0a0c12] ring-1 ring-white/10">
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

            {stage === "intro" && (
              <button
                onClick={handleStart}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-center text-white backdrop-blur-sm transition hover:bg-black/50"
              >
                <span className="text-sm uppercase tracking-[0.4em] text-white/70">Booth ready</span>
                <span className="text-3xl font-semibold">Tap to start</span>
              </button>
            )}

            {(stage === "live" || stage === "countdown") && (
              <button
                onClick={beginCountdown}
                className="absolute inset-0 flex items-center justify-center bg-black/35 text-center text-white transition hover:bg-black/25"
              >
                <div className="rounded-full bg-black/60 px-5 py-3 text-lg font-semibold text-white/90">
                  {countdown ? countdown : "Tap to snap your photo"}
                </div>
              </button>
            )}

            {stage === "review" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                  Looks good?
                </div>
              </div>
            )}

            {stage === "processing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-center text-white">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <p className="mt-3 text-sm text-white/70">Running background removal…</p>
              </div>
            )}

            {stage === "sent" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-center text-white">
                <div className="rounded-full bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30">
                  Delivered
                </div>
                <p className="mt-2 text-sm text-white/80">Check your inbox for the download link.</p>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex flex-col gap-4 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Steps</p>
                <p className="text-sm text-white/80">
                  {stage === "intro" && "Tap to start the booth"}
                  {stage === "live" && "Tap anywhere to start the countdown"}
                  {stage === "countdown" && "Hold still… capturing next"}
                  {stage === "review" && "Retake or continue to background removal"}
                  {stage === "processing" && "Processing with MODNet"}
                  {stage === "select" && "Pick your background(s) then send"}
                  {stage === "sent" && "Delivered — start another?"}
                </p>
              </div>
              {(stage === "review" || stage === "select" || stage === "sent") && (
                <button
                  onClick={handleRetake}
                  className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
                >
                  Retake
                </button>
              )}
            </div>

            <div className="space-y-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <label className="text-sm text-white/70">
                Guest email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                />
              </label>
              <p className="text-xs text-white/50">
                We’ll send the finished photo(s) as a single download link. Photos stay in R2, not on this
                device.
              </p>
            </div>

            {stage === "review" && (
              <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <p className="text-sm font-semibold text-white">Happy with this photo?</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleRetake}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
                  >
                    Retake
                  </button>
                  <button
                    onClick={processCutout}
                    disabled={processing}
                    className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-cyan-500/30 transition hover:brightness-105 disabled:opacity-60"
                  >
                    {processing ? "Processing…" : "Looks good — continue"}
                  </button>
                </div>
              </div>
            )}

            {(stage === "select" || stage === "sent") && (
              <div className="space-y-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Choose background</p>
                  {selectionLimit ? (
                    <span className="text-xs text-white/50">
                      Up to {selectionLimit} option{selectionLimit > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>
                {loadingBackgrounds && (
                  <p className="text-sm text-white/60">Loading backgrounds…</p>
                )}
                {!loadingBackgrounds && backgrounds.length === 0 && (
                  <p className="text-sm text-white/60">
                    No backgrounds configured for this event. Ask the host to enable them.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {backgrounds.map((bg) => {
                    const selected = selectedBackgrounds.has(bg.id);
                    return (
                      <button
                        key={bg.id}
                        onClick={() => toggleBackground(bg.id)}
                        className={`group overflow-hidden rounded-xl border text-left transition ${
                          selected
                            ? "border-cyan-400/60 bg-white/10 shadow-lg shadow-cyan-500/20"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <div
                          className="aspect-video w-full bg-black/60"
                          style={{
                            backgroundImage: `url(${bg.previewAsset || bg.asset})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        <div className="flex items-center justify-between px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{bg.name}</p>
                            <p className="text-[11px] text-white/60">{bg.category || "background"}</p>
                          </div>
                          <span
                            className={`h-5 w-5 rounded-full border ${
                              selected
                                ? "border-cyan-300 bg-cyan-400/80"
                                : "border-white/30 bg-black/30"
                            }`}
                            aria-hidden
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {stage === "select" && (
              <button
                onClick={sendEmail}
                disabled={sending}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 transition hover:brightness-105 disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send to guest"}
              </button>
            )}

            {stage === "sent" && (
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-50 ring-1 ring-emerald-400/30">
                  Sent! We’ll deliver a single download link with the selected backgrounds.
                </div>
                <button
                  onClick={handleRetake}
                  className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
                >
                  Start another
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
