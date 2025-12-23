"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

interface EventInfo {
  id: string;
  name: string;
  slug: string;
  backgroundRemovalEnabled: boolean;
  backgrounds: Array<{ id: string; name: string; url: string }>;
}

interface Session {
  id: string;
  email: string;
  name: string | null;
  photoCount: number;
}

interface Photo {
  id: string;
  originalUrl: string;
  cutoutUrl: string | null;
}

type Stage = "lookup" | "select" | "deliver" | "done";

export default function ReviewPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stage, setStage] = useState<Stage>("lookup");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [delivering, setDelivering] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/v1/public/events/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data.data);
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

  async function lookupEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    try {
      const res = await fetch(`/api/v1/public/events/${slug}/sessions?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        const foundSessions = data.data.items || [];
        if (foundSessions.length === 0) {
          setError("No photos found for this email");
          return;
        }
        setSessions(foundSessions);

        if (foundSessions.length === 1) {
          selectSession(foundSessions[0]);
        }
      }
    } catch (e) {
      setError("Lookup failed");
    }
  }

  async function selectSession(session: Session) {
    setSelectedSession(session);

    const res = await fetch(`/api/v1/public/sessions/${session.id}/photos`);
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.data.photos || []);
      setStage("select");
    }
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
    if (!event || !selectedSession || selectedPhotos.size === 0) return;

    setDelivering(true);

    try {
      const selections = Array.from(selectedPhotos).map((photoId) => ({
        photoId,
        backgroundId: selectedBackground,
      }));

      const res = await fetch(`/api/v1/events/${event.id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sessionId: selectedSession.id, selections }),
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

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 text-center">
        <h1 className="text-2xl font-bold text-white">{event?.name}</h1>
        <p className="text-white/70">Review & Download Your Photos</p>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {stage === "lookup" && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 w-full max-w-md space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Find Your Photos</h2>
            <form onSubmit={lookupEmail} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="you@example.com"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full bg-white text-purple-900 font-bold py-3 rounded-lg hover:bg-white/90 transition"
              >
                Find My Photos
              </button>
            </form>

            {sessions.length > 1 && (
              <div className="space-y-2">
                <p className="text-white/70 text-sm">Multiple sessions found:</p>
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => selectSession(session)}
                    className="w-full text-left bg-white/10 p-3 rounded-lg hover:bg-white/20"
                  >
                    <div className="text-white">{session.name || session.email}</div>
                    <div className="text-white/50 text-sm">{session.photoCount} photos</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {stage === "select" && (
          <div className="w-full max-w-4xl space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">Select Your Photos</h2>
              <p className="text-white/70">{selectedSession?.name || email}</p>
            </div>

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

            {event?.backgroundRemovalEnabled && event.backgrounds.length > 0 && (
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
              {delivering ? "Sending..." : `Send ${selectedPhotos.size} photo${selectedPhotos.size !== 1 ? "s" : ""}`}
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
                setStage("lookup");
                setEmail("");
                setPhotos([]);
                setSelectedPhotos(new Set());
                setSelectedSession(null);
                setSessions([]);
              }}
              className="w-full bg-white text-purple-900 font-bold py-3 rounded-lg hover:bg-white/90 transition"
            >
              Done
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
