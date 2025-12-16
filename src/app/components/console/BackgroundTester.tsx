"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, StopCircle, RefreshCw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="size-5" />
              Background Tester
            </CardTitle>
            <CardDescription>
              Check lighting and framing before the event. Capture a quick preview with the default background.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={startBackgroundTest}
            >
              <RefreshCw className="size-4" />
              {testStream ? "Restart" : "Start test"}
            </Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={captureBackgroundTest}
              disabled={testLoading}
            >
              {testLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Capturing…
                </>
              ) : (
                <>
                  <Camera className="size-4" />
                  Capture
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={stopTestStream}
            >
              <StopCircle className="size-4" />
              Stop
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {testError && (
          <Alert variant="destructive">
            <AlertDescription>{testError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary ring-1 ring-border">
              <video
                ref={testVideoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
                autoPlay
              />
              {!testVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  {testStream ? "Starting camera…" : "Start the tester to preview your setup."}
                </div>
              )}
            </div>
            {testMessage && <p className="text-sm text-muted-foreground">{testMessage}</p>}
            {testProcessing && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LoadingSpinner size="sm" />
                Running background removal…
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Captured Preview</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTestShowTips((prev) => !prev)}
                  >
                    <Lightbulb className="size-4" />
                    {testShowTips ? "Hide tips" : "Tips"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-secondary ring-1 ring-border">
                  {testResult ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={testResult} alt="Background test result" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground p-4 text-center">
                      Capture a frame to see how your background will look.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {testShowTips && (
              <Card className="bg-secondary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quick Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Keep subjects 2–3 ft in front of a light gray wall or backdrop.</li>
                    <li>• Aim the ring light slightly above eye level to avoid harsh shadows.</li>
                    <li>• Remove backlighting and keep the camera at 5–5.3 ft height.</li>
                    <li>• Capture once to confirm framing, then start your event.</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <canvas ref={testCanvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
