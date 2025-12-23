"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

interface EventInfo {
  id: string;
  name: string;
  slug: string;
  mode: string;
}

interface Session {
  id: string;
  email: string;
  name: string | null;
  photoCount: number;
  createdAt: string;
}

interface Photo {
  id: string;
  originalUrl: string;
  cutoutUrl: string | null;
}

export default function PhotographerPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/v1/public/events/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data.data);
          fetchSessions();
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
  }, [slug]);

  async function fetchSessions() {
    const res = await fetch(`/api/v1/public/events/${slug}/sessions`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.data.items || []);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
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
        setEmail("");
        setName("");
        setShowCheckin(false);
        await fetchSessions();
        selectSession({ id: data.data.sessionId, email, name: name || null, photoCount: 0, createdAt: new Date().toISOString() });
      }
    } catch (e) {
      setError("Check-in failed");
    }
  }

  async function selectSession(session: Session) {
    setActiveSession(session);
    startCamera();

    const res = await fetch(`/api/v1/public/sessions/${session.id}/photos`);
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.data.photos || []);
    }
  }

  async function capturePhoto() {
    if (!videoRef.current || !activeSession || !event) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;

    const formData = new FormData();
    formData.append("sessionId", activeSession.id);
    formData.append("photos", blob, `photo-${Date.now()}.jpg`);

    try {
      const res = await fetch(`/api/v1/events/${event.id}/photos`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const photosRes = await fetch(`/api/v1/public/sessions/${activeSession.id}/photos`);
        if (photosRes.ok) {
          const photosData = await photosRes.json();
          setPhotos(photosData.data.photos || []);
        }
        fetchSessions();
      }
    } catch (e) {
      console.error("Failed to upload photo:", e);
    }
  }

  function closeSession() {
    stopCamera();
    setActiveSession(null);
    setPhotos([]);
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
    <div className="min-h-screen flex">
      <aside className="w-80 bg-black/30 p-4 space-y-4 overflow-y-auto">
        <h1 className="text-xl font-bold text-white">{event.name}</h1>
        <p className="text-white/70 text-sm">Photographer Mode</p>

        <button
          onClick={() => setShowCheckin(true)}
          className="w-full bg-white text-purple-900 font-bold py-2 rounded-lg hover:bg-white/90"
        >
          + New Guest
        </button>

        <div className="space-y-2">
          <h2 className="text-white/70 text-sm">Sessions ({sessions.length})</h2>
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => selectSession(session)}
              className={`w-full text-left p-3 rounded-lg transition ${
                activeSession?.id === session.id ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="text-white font-medium truncate">{session.name || session.email}</div>
              <div className="text-white/50 text-sm">{session.photoCount} photos</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-4">
        {showCheckin && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <form onSubmit={handleCheckin} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
              <h2 className="text-xl font-bold">New Guest Check-in</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex space-x-2">
                <button type="button" onClick={() => setShowCheckin(false)} className="flex-1 border py-2 rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-lg">
                  Check In
                </button>
              </div>
            </form>
          </div>
        )}

        {activeSession ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">{activeSession.name || activeSession.email}</h2>
                <p className="text-white/70">{photos.length} photos</p>
              </div>
              <button onClick={closeSession} className="text-white/70 hover:text-white">
                ✕ Close
              </button>
            </div>

            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>

            <div className="flex justify-center">
              <button
                onClick={capturePhoto}
                className="bg-white text-purple-900 font-bold px-12 py-4 rounded-full text-xl hover:bg-white/90 transition"
              >
                📸 Capture
              </button>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((photo) => (
                  <Image
                    key={photo.id}
                    src={photo.cutoutUrl || photo.originalUrl}
                    alt="Captured"
                    width={150}
                    height={150}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-white/50">
            Select a guest or create a new check-in to start capturing
          </div>
        )}
      </main>
    </div>
  );
}
