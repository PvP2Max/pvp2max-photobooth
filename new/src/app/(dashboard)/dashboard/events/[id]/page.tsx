"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AIBackgroundGenerator } from "@/components/dashboard/AIBackgroundGenerator";

interface Event {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  mode: string;
  photoUsed: number;
  photoCap: number;
  aiUsed: number;
  aiCredits: number;
  backgroundRemovalEnabled: boolean;
  eventDate: string | null;
}

interface Photo {
  id: string;
  originalName: string;
  originalUrl: string;
  cutoutUrl: string | null;
  session: { email: string; name: string | null } | null;
  createdAt: string;
}

interface Background {
  id: string;
  name: string;
  url: string;
  isDefault: boolean;
  isAiGenerated: boolean;
  isEnabled: boolean;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "photos" | "backgrounds">("overview");
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventRes, photosRes, bgRes] = await Promise.all([
          fetch(`/api/v1/events/${eventId}`),
          fetch(`/api/v1/events/${eventId}/photos`),
          fetch(`/api/v1/events/${eventId}/backgrounds?all=true`),
        ]);

        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setEvent(eventData.data);
        }

        if (photosRes.ok) {
          const photosData = await photosRes.json();
          setPhotos(photosData.data?.items || []);
        }

        if (bgRes.ok) {
          const bgData = await bgRes.json();
          setBackgrounds(bgData.data?.items || []);
        }
      } catch (e) {
        console.error("Failed to fetch data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [eventId]);

  async function updateStatus(status: string) {
    const res = await fetch(`/api/v1/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setEvent((prev) => prev ? { ...prev, status } : null);
    }
  }

  async function updateMode(mode: string) {
    const res = await fetch(`/api/v1/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (res.ok) {
      setEvent((prev) => prev ? { ...prev, mode } : null);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!event) {
    return <div className="text-center py-12">Event not found</div>;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-gray-500">{event.plan} Plan • {event.mode === "PHOTOGRAPHER" ? "Photographer Mode" : "Self-service"}</p>
        </div>
        <div className="flex space-x-2">
          {event.status === "DRAFT" && (
            <button onClick={() => updateStatus("LIVE")} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Go Live
            </button>
          )}
          {event.status === "LIVE" && (
            <>
              <Link href={`${appUrl}/booth/${event.slug}`} target="_blank" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Open Booth
              </Link>
              <button onClick={() => updateStatus("CLOSED")} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                Close Event
              </button>
            </>
          )}
          {event.status === "CLOSED" && (
            <button onClick={() => updateStatus("LIVE")} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Reopen
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-4 border-b">
        {(["overview", "photos", "backgrounds"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="font-semibold">Event Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-1 text-xs rounded ${
                  event.status === "LIVE" ? "bg-green-100 text-green-800" :
                  event.status === "DRAFT" ? "bg-yellow-100 text-yellow-800" :
                  "bg-gray-100 text-gray-800"
                }`}>{event.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">URL</span>
                <span className="font-mono">/booth/{event.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Photos</span>
                <span>{event.photoUsed} / {event.photoCap}</span>
              </div>
              {event.aiCredits > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">AI Backgrounds</span>
                  <span>{event.aiUsed} / {event.aiCredits}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Background Removal</span>
                <span>{event.backgroundRemovalEnabled ? "Enabled" : "Disabled"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="font-semibold">Mode</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => updateMode("SELF_SERVICE")}
                className={`flex-1 px-4 py-2 rounded-lg border ${event.mode === "SELF_SERVICE" ? "bg-blue-50 border-blue-500" : "border-gray-200"}`}
              >
                Self-service
              </button>
              {event.plan === "CORPORATE" && (
                <button
                  onClick={() => updateMode("PHOTOGRAPHER")}
                  className={`flex-1 px-4 py-2 rounded-lg border ${event.mode === "PHOTOGRAPHER" ? "bg-blue-50 border-blue-500" : "border-gray-200"}`}
                >
                  Photographer
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {event.mode === "SELF_SERVICE"
                ? "Guests check in and take their own photos."
                : "A photographer takes photos, guests review and select their favorites."}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="font-semibold">Booth Links</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500 block">Guest Check-in</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{appUrl}/booth/{event.slug}</code>
              </div>
              {event.mode === "PHOTOGRAPHER" && (
                <div>
                  <span className="text-gray-500 block">Photographer</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{appUrl}/photographer/{event.slug}</code>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="font-semibold">QR Code</h3>
            <div className="flex justify-center">
              <Image
                src={`/api/v1/events/${eventId}/qr`}
                alt="Event QR Code"
                width={200}
                height={200}
                className="border rounded"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "photos" && (
        <div className="bg-white rounded-lg shadow">
          {photos.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No photos yet</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <Image
                    src={photo.cutoutUrl || photo.originalUrl}
                    alt={photo.originalName}
                    width={200}
                    height={200}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs">{photo.session?.email || "Unknown"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "backgrounds" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Backgrounds</h3>
            {event.aiCredits > event.aiUsed && (
              <button
                onClick={() => setShowAIGenerator(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Generate AI Background ({event.aiCredits - event.aiUsed} left)
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {backgrounds.map((bg) => (
              <div key={bg.id} className={`relative group ${!bg.isEnabled ? "opacity-50" : ""}`}>
                <Image
                  src={bg.url}
                  alt={bg.name}
                  width={200}
                  height={150}
                  className="w-full aspect-video object-cover rounded-lg"
                />
                <div className="mt-1 text-xs truncate">{bg.name}</div>
                {bg.isAiGenerated && (
                  <span className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-1 rounded">AI</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAIGenerator && event && (
        <AIBackgroundGenerator
          eventId={event.id}
          creditsRemaining={event.aiCredits - event.aiUsed}
          onGenerated={async () => {
            const bgRes = await fetch(`/api/v1/events/${eventId}/backgrounds?all=true`);
            if (bgRes.ok) {
              const bgData = await bgRes.json();
              setBackgrounds(bgData.data?.items || []);
            }
            setEvent((prev) => prev ? { ...prev, aiUsed: prev.aiUsed + 1 } : null);
          }}
          onClose={() => setShowAIGenerator(false)}
        />
      )}
    </div>
  );
}
