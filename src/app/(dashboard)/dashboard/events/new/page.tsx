"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Business {
  id: string;
  name: string;
  slug: string;
}

function NewEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<"FREE" | "PRO" | "CORPORATE">("FREE");
  const [eventDate, setEventDate] = useState("");

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    async function fetchBusiness() {
      try {
        const res = await fetch("/api/v1/businesses");
        if (res.ok) {
          const data = await res.json();
          const firstBusiness = data.data?.items?.[0];
          if (firstBusiness) {
            setBusiness(firstBusiness);
          } else {
            const createRes = await fetch("/api/v1/businesses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "My Business" }),
            });
            if (createRes.ok) {
              const createData = await createRes.json();
              setBusiness(createData.data);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch business:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchBusiness();
  }, []);

  useEffect(() => {
    setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }, [name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!business || !name || !slug) return;

    setCreating(true);

    try {
      if (plan === "FREE") {
        const res = await fetch("/api/v1/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: business.id, name, slug, plan, eventDate: eventDate || undefined }),
        });

        if (res.ok) {
          router.push("/dashboard/events?created=true");
        } else {
          const data = await res.json();
          alert(data.error || "Failed to create event");
        }
      } else {
        const res = await fetch("/api/v1/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: business.id, eventName: name, eventSlug: slug, plan, eventDate: eventDate || undefined }),
        });

        if (res.ok) {
          const data = await res.json();
          window.location.href = data.data.url;
        } else {
          const data = await res.json();
          alert(data.error || "Failed to create checkout");
        }
      }
    } catch (e) {
      console.error("Failed to create event:", e);
      alert("Failed to create event");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const planInfo = {
    FREE: { price: "$0", photos: 25, features: ["25 photos", "Self-service mode", "Watermarked"] },
    PRO: { price: "$30", photos: 300, features: ["300 photos", "Background removal", "5 AI backgrounds", "No watermark"] },
    CORPORATE: { price: "$100", photos: 1000, features: ["1000 photos", "Background removal", "10 AI backgrounds", "Photographer mode"] },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Create Event</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Payment successful! Your event has been created.
        </div>
      )}

      {canceled && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          Payment was canceled. You can try again or select a different plan.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="My Awesome Event"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event URL Slug</label>
          <div className="flex items-center">
            <span className="text-gray-500 mr-2">/booth/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="my-event"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Date (optional)</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Plan</label>
          <div className="grid grid-cols-3 gap-4">
            {(["FREE", "PRO", "CORPORATE"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  plan === p ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-bold">{p}</div>
                <div className="text-lg font-semibold">{planInfo[p].price}</div>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  {planInfo[p].features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={creating || !name || !slug}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? "Processing..." : plan === "FREE" ? "Create Event" : `Continue to Payment (${planInfo[plan].price})`}
        </button>
      </form>
    </div>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <NewEventForm />
    </Suspense>
  );
}
