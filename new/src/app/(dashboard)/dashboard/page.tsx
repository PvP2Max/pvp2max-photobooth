"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  photoUsed: number;
  photoCap: number;
  createdAt: string;
}

interface Business {
  id: string;
  name: string;
  slug: string;
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsRes, businessRes] = await Promise.all([
          fetch("/api/v1/events"),
          fetch("/api/v1/businesses"),
        ]);

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData.data?.items || []);
        }

        if (businessRes.ok) {
          const businessData = await businessRes.json();
          setBusiness(businessData.data?.items?.[0] || null);
        }
      } catch (e) {
        console.error("Failed to fetch data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const recentEvents = events.slice(0, 5);
  const liveEvents = events.filter((e) => e.status === "LIVE");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {business && <p className="text-gray-500">{business.name}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Events</h3>
          <p className="text-3xl font-bold">{events.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Live Events</h3>
          <p className="text-3xl font-bold">{liveEvents.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Photos</h3>
          <p className="text-3xl font-bold">{events.reduce((acc, e) => acc + e.photoUsed, 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Recent Events</h2>
          <Link href="/dashboard/events/new" className="text-sm text-blue-600 hover:text-blue-800">
            + New Event
          </Link>
        </div>
        {recentEvents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No events yet.{" "}
            <Link href="/dashboard/events/new" className="text-blue-600">
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {recentEvents.map((event) => (
              <div key={event.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <Link href={`/dashboard/events/${event.id}`} className="font-medium hover:text-blue-600">
                    {event.name}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {event.photoUsed} / {event.photoCap} photos • {event.plan}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs rounded ${
                    event.status === "LIVE" ? "bg-green-100 text-green-800" :
                    event.status === "DRAFT" ? "bg-yellow-100 text-yellow-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {event.status}
                  </span>
                  {event.status === "LIVE" && (
                    <Link
                      href={`${appUrl}/booth/${event.slug}`}
                      target="_blank"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Open Booth →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
