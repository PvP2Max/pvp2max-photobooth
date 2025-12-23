"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface Business {
  id: string;
  name: string;
  slug: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userName, setUserName] = useState("");
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [userRes, businessRes] = await Promise.all([
          fetch("/api/v1/auth/me"),
          fetch("/api/v1/businesses"),
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.data);
          setUserName(userData.data?.name || "");
        }

        if (businessRes.ok) {
          const businessData = await businessRes.json();
          const firstBusiness = businessData.data?.items?.[0];
          if (firstBusiness) {
            setBusiness(firstBusiness);
            setBusinessName(firstBusiness.name);
          }
        }
      } catch (e) {
        console.error("Failed to fetch data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function saveUserSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/v1/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
      }
    } catch (e) {
      console.error("Failed to save:", e);
    } finally {
      setSaving(false);
    }
  }

  async function saveBusinessSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;

    setSaving(true);

    try {
      const res = await fetch(`/api/v1/businesses/${business.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: businessName }),
      });

      if (res.ok) {
        const data = await res.json();
        setBusiness(data.data);
      }
    } catch (e) {
      console.error("Failed to save:", e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <form onSubmit={saveUserSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {business && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Business</h2>
          <form onSubmit={saveBusinessSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Business"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <p className="text-sm text-gray-500 mb-4">Sign out of your account or manage your authentication settings.</p>
        <a
          href="/auth/logout"
          className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Sign Out
        </a>
      </div>
    </div>
  );
}
