"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

interface EventInfo {
  id: string;
  name: string;
  slug: string;
  mode: string;
  backgroundRemovalEnabled: boolean;
  backgrounds: Array<{ id: string; name: string; url: string; category: string }>;
}

interface Photo {
  id: string;
  originalUrl: string;
  cutoutUrl: string | null;
}

type Stage = "checkin" | "capture" | "select" | "deliver" | "done";

export default function BoothPage() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("checkin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [delivering, setDelivering] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/v1/public/events/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data.data);
          if (data.data.mode === "PHOTOGRAPHER") {
            router.push(`/review/${slug}`);
          }
        } else {
          setError("Event not found");
        }
      } catch (e) {
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [slug, router]);

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!event || !email) return;

    try {
      const res = await fetch(`/api/v1/public/events/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });

      if (res.ok) {
        const data = await res.json();
        setSessionId(data.data.sessionId);
        setStage("capture");
        startCamera();
      } else {
        const data = await res.json();
        setError(data.error || "Check-in failed");
      }
    } catch (e) {
      setError("Check-in failed");
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      setError("Camera access denied");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function capturePhoto() {
    if (!videoRef.current || !sessionId || !event) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;

    const formData = new FormData();
    formData.append("sessionId", sessionId);
    formData.append("photos", blob, `photo-${Date.now()}.jpg`);

    try {
      const res = await fetch(`/api/v1/events/${event.id}/photos`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const photosRes = await fetch(`/api/v1/public/sessions/${sessionId}/photos`);
        if (photosRes.ok) {
          const photosData = await photosRes.json();
          setPhotos(photosData.data.photos || []);
        }
      }
    } catch (e) {
      console.error("Failed to upload photo:", e);
    }
  }

  function finishCapture() {
    stopCamera();
    setStage("select");
  }

  function togglePhotoSelection(photoId: string) {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  }

  async function handleDeliver() {
    if (!event || !sessionId || selectedPhotos.size === 0) return;

    setDelivering(true);

    try {
      const selections = Array.from(selectedPhotos).map((photoId) => ({
        photoId,
        backgroundId: selectedBackground,
      }));

      const res = await fetch(`/api/v1/events/${event.id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sessionId, selections }),
      });

      if (res.ok) {
        setStage("done");
      } else {
        const data = await res.json();
        setError(data.error || "Delivery failed");
      }
    } catch (e) {
      setError("Delivery failed");
    } finally {
      setDelivering(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">{error || "Event not found"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 text-center">
        <h1 className="text-2xl font-bold text-white">{event.name}</h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {stage === "checkin" && (
          <form onSubmit={handleCheckin} className="bg-white/10 backdrop-blur rounded-2xl p-8 w-full max-w-md space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Welcome!</h2>
            <p className="text-white/70 text-center">Enter your email to get started</p>
            <div>
              <label className="block text-white/70 text-sm mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Your name"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-white text-purple-900 font-bold py-3 rounded-lg hover:bg-white/90 transition"
            >
              Start
            </button>
          </form>
        )}

        {stage === "capture" && (
          <div className="w-full max-w-2xl space-y-4">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={capturePhoto}
                className="bg-white text-purple-900 font-bold px-8 py-4 rounded-full text-xl hover:bg-white/90 transition"
              >
                📸 Capture
              </button>
              {photos.length > 0 && (
                <button
                  onClick={finishCapture}
                  className="bg-green-500 text-white font-bold px-8 py-4 rounded-full text-xl hover:bg-green-600 transition"
                >
                  Done ({photos.length})
                </button>
              )}
            </div>
            {photos.length > 0 && (
              <div className="flex justify-center gap-2">
                {photos.map((photo) => (
                  <Image
                    key={photo.id}
                    src={photo.cutoutUrl || photo.originalUrl}
                    alt="Captured"
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {stage === "select" && (
          <div className="w-full max-w-4xl space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Select your photos</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => togglePhotoSelection(photo.id)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-4 transition ${
                    selectedPhotos.has(photo.id) ? "border-green-500" : "border-transparent"
                  }`}
                >
                  <Image
                    src={photo.cutoutUrl || photo.originalUrl}
                    alt="Photo"
                    fill
                    className="object-cover"
                  />
                  {selectedPhotos.has(photo.id) && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>

            {event.backgroundRemovalEnabled && event.backgrounds.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg text-white">Choose a background</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedBackground(null)}
                    className={`shrink-0 w-20 h-14 rounded-lg border-2 bg-gray-800 flex items-center justify-center text-white text-sm ${
                      selectedBackground === null ? "border-green-500" : "border-transparent"
                    }`}
                  >
                    None
                  </button>
                  {event.backgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBackground(bg.id)}
                      className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 ${
                        selectedBackground === bg.id ? "border-green-500" : "border-transparent"
                      }`}
                    >
                      <Image src={bg.url} alt={bg.name} width={80} height={56} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleDeliver}
              disabled={selectedPhotos.size === 0 || delivering}
              className="w-full bg-green-500 text-white font-bold py-4 rounded-lg text-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {delivering ? "Sending..." : `Send ${selectedPhotos.size} photo${selectedPhotos.size !== 1 ? "s" : ""} to ${email}`}
            </button>
          </div>
        )}

        {stage === "done" && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 w-full max-w-md text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-white">Photos Sent!</h2>
            <p className="text-white/70">Check your email at <span className="font-bold">{email}</span> for your photos.</p>
            <button
              onClick={() => {
                setStage("checkin");
                setEmail("");
                setName("");
                setPhotos([]);
                setSelectedPhotos(new Set());
                setSessionId(null);
              }}
              className="w-full bg-white text-purple-900 font-bold py-3 rounded-lg hover:bg-white/90 transition"
            >
              Start Over
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
