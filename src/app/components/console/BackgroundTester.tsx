"use client";

import { useEffect, useRef, useState } from "react";

export interface BackgroundTesterProps {
  defaultBgPreview?: string;
}

export function BackgroundTester({
  defaultBgPreview = "/assets/defaults/backgrounds/Modern White Marble.png",
}: BackgroundTesterProps) {
  const [testStream, setTestStream] = useState<MediaStream | null>(null);
  const [testVideoReady, setTestVideoReady] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testShowTips, setTestShowTips] = useState(false);
  const [testProcessing, setTestProcessing] = useState(false);
  const testVideoRef = useRef<HTMLVideoElement | null>(null);
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);

  function stopTestStream() {
    if (testStream) {
      testStream.getTracks().forEach((track) => track.stop());
    }
    setTestStream(null);
    setTestVideoReady(false);
  }

  useEffect(() => {
    return () => {
      stopTestStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const video = testVideoRef.current;
    if (video && testStream) {
      video.srcObject = testStream;
      video.onloadedmetadata = async () => {
        try {
          await video.play();
          setTestVideoReady(true);
        } catch {
          setTestError("Could not start preview. Check camera permissions.");
        }
      };
    }
    if (!testStream && video) {
      video.srcObject = null;
    }
  }, [testStream]);

  async function startBackgroundTest() {
    setTestError(null);
    setTestMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setTestStream(stream);
      setTestMessage("Camera ready. Capture a frame to preview.");
    } catch (err) {
      console.error(err);
      setTestError("Unable to access camera. Please allow permission.");
      stopTestStream();
    }
  }

  async function captureBackgroundTest() {
    const video = testVideoRef.current;
    const canvas = testCanvasRef.current;
    if (!video || !canvas || !testStream) {
      setTestError("Start the camera first, then capture a frame.");
      return;
    }
    if (!video.videoWidth) {
      setTestError("Camera is warming up. Try again in a moment.");
      return;
    }
    setTestLoading(true);
    setTestError(null);
    setTestMessage("Captured frame. Applying background removal…");
    setTestProcessing(true);
    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setTestError("Preview not available. Try again.");
      setTestLoading(false);
      return;
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png");
    setTestResult(dataUrl);

    try {
      const res = await fetch("/api/backgrounds/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, background: "Modern White Marble.png" }),
      });
      const payload = (await res.json().catch(() => ({}))) as { image?: string; error?: string };
      if (!res.ok || !payload.image) {
        throw new Error(payload.error || "Preview failed. Showing raw frame.");
      }
      setTestResult(payload.image);
      setTestMessage("Background removed and applied to the default backdrop.");
    } catch (err) {
      console.error(err);
      const bg = new Image();
      bg.crossOrigin = "anonymous";
      bg.src = defaultBgPreview;
      bg.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(bg, 0, 0, width, height);
        ctx.drawImage(video, 0, 0, width, height);
        const url = canvas.toDataURL("image/png");
        setTestResult(url);
        setTestMessage("Preview captured without AI removal (fallback).");
      };
      bg.onerror = () => {
        const url = canvas.toDataURL("image/png");
        setTestResult(url);
        setTestMessage("Preview captured (background image unavailable).");
      };
    } finally {
      setTestLoading(false);
      setTestProcessing(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Background tester</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Check lighting and framing before the event. Capture a quick preview with the default
            background.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={startBackgroundTest}
            className="rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]"
          >
            {testStream ? "Restart camera" : "Start test"}
          </button>
          <button
            onClick={captureBackgroundTest}
            disabled={testLoading}
            className="rounded-full bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90 disabled:opacity-60"
          >
            {testLoading ? "Capturing…" : "Capture preview"}
          </button>
          <button
            onClick={stopTestStream}
            className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
          >
            Stop
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-bg-subtle)] ring-1 ring-[var(--color-border-subtle)]">
            <video
              ref={testVideoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {!testVideoReady && (
              <div className="flex h-full w-full items-center justify-center text-sm text-[var(--color-text-muted)]">
                {testStream ? "Starting camera…" : "Start the tester to preview your setup."}
              </div>
            )}
          </div>
          {testError && <p className="text-sm text-[var(--color-text)]">{testError}</p>}
          {testMessage && <p className="text-sm text-[var(--color-text-muted)]">{testMessage}</p>}
          {testProcessing && (
            <p className="text-xs text-[var(--color-text-muted)]">Running background removal…</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-[var(--color-surface-elevated)] p-3 ring-1 ring-[var(--color-border-subtle)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--color-text)]">Captured preview</p>
              <button
                onClick={() => setTestShowTips((prev) => !prev)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                {testShowTips ? "Hide tips" : "Show tips"}
              </button>
            </div>
            <div className="mt-3 aspect-[4/3] overflow-hidden rounded-lg bg-[var(--color-bg-subtle)] ring-1 ring-[var(--color-border-subtle)]">
              {testResult ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={testResult} alt="Background test result" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                  Capture a frame to see how your background will look.
                </div>
              )}
            </div>
          </div>
          {testShowTips && (
            <div className="space-y-2 rounded-xl bg-[var(--color-surface-elevated)] p-3 text-sm text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]">
              <p className="font-semibold">Quick tips</p>
              <ul className="space-y-1 text-[var(--color-text-muted)]">
                <li>• Keep subjects 2–3 ft in front of a light gray wall or backdrop.</li>
                <li>• Aim the ring light slightly above eye level to avoid harsh shadows.</li>
                <li>• Remove backlighting and keep the camera at 5–5.3 ft height.</li>
                <li>• Capture once to confirm framing, then start your event.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <canvas ref={testCanvasRef} className="hidden" />
    </div>
  );
}
