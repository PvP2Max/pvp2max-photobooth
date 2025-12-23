"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  mode: string;
  photoUsed: number;
  photoCap: number;
  eventDate: string | null;
  createdAt: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/v1/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data.data?.items || []);
        }
      } catch (e) {
        console.error("Failed to fetch events:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link
          href="/dashboard/events/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No events yet</h3>
          <p className="mt-2 text-gray-500">Get started by creating your first event.</p>
          <Link
            href="/dashboard/events/new"
            className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Event
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/dashboard/events/${event.id}`} className="font-medium hover:text-blue-600">
                      {event.name}
                    </Link>
                    <p className="text-sm text-gray-500">{event.mode === "PHOTOGRAPHER" ? "Photographer" : "Self-service"}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      event.status === "LIVE" ? "bg-green-100 text-green-800" :
                      event.status === "DRAFT" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.plan}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.photoUsed} / {event.photoCap}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link href={`/dashboard/events/${event.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                      Manage
                    </Link>
                    {event.status === "LIVE" && (
                      <Link
                        href={`${appUrl}/booth/${event.slug}`}
                        target="_blank"
                        className="text-green-600 hover:text-green-900"
                      >
                        Booth
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
