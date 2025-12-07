"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BusinessSession = {
  business: { id: string; name: string; slug: string; apiKeyHint?: string };
  events: EventItem[];
  expiresAt?: string;
  user?: { id: string; email: string };
};

type EventItem = {
  id: string;
  name: string;
  slug: string;
  status?: "draft" | "live" | "closed";
  accessHint?: string;
  createdAt?: string;
  plan?: string;
  photoCap?: number | null;
  photoUsed?: number;
  aiCredits?: number;
  aiUsed?: number;
  mode?: "self-serve" | "photographer";
  allowBackgroundRemoval?: boolean;
  allowAiBackgrounds?: boolean;
  allowAiFilters?: boolean;
  deliveryEmail?: boolean;
  deliverySms?: boolean;
  overlayTheme?: string;
  galleryPublic?: boolean;
  eventDate?: string;
  eventTime?: string;
  allowedSelections?: number;
  paymentStatus?: "unpaid" | "pending" | "paid";
};

type ProductionItem = {
  id: string;
  email: string;
  createdAt: string;
  downloadToken?: string;
  tokenExpiresAt?: string;
  attachments: { filename: string; contentType: string; size: number }[];
};

function linkFor(pathname: string, business: string, event: string) {
  const qs = new URLSearchParams({ business, event }).toString();
  return `${pathname}?${qs}`;
}

function usageFor(event: EventItem) {
  const cap = event.photoCap ?? null;
  const used = event.photoUsed ?? 0;
  const remaining = cap === null ? null : Math.max(cap - used, 0);
  const aiCap = event.aiCredits ?? 0;
  const aiUsed = event.aiUsed ?? 0;
  return {
    photoCap: cap,
    photoUsed: used,
    remainingPhotos: remaining,
    aiCredits: aiCap,
    aiUsed,
    remainingAi: Math.max(aiCap - aiUsed, 0),
  };
}

export default function BusinessPage() {
  const [session, setSession] = useState<BusinessSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registering, setRegistering] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessSlug, setNewBusinessSlug] = useState("");
  const [newEventName, setNewEventName] = useState("");
  const [newEventSlug, setNewEventSlug] = useState("");
  const [newEventKey, setNewEventKey] = useState("");
  const [newPlan, setNewPlan] = useState("event-basic");
  const [newMode, setNewMode] = useState<"self-serve" | "photographer">("self-serve");
  const [newAllowedSelections, setNewAllowedSelections] = useState(3);
  const [newAllowBgRemoval, setNewAllowBgRemoval] = useState(true);
  const [newAllowAiBg, setNewAllowAiBg] = useState(false);
  const [newAllowAiFilters, setNewAllowAiFilters] = useState(false);
  const [newDeliverySms, setNewDeliverySms] = useState(false);
  const [newGalleryPublic, setNewGalleryPublic] = useState(false);
  const [newOverlayTheme, setNewOverlayTheme] = useState("default");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [issuingKey, setIssuingKey] = useState<Record<string, string>>({});
  const [resendEmail, setResendEmail] = useState<Record<string, string>>({});
  const [productionEvent, setProductionEvent] = useState<string>("");
  const [productions, setProductions] = useState<Record<string, ProductionItem[]>>({});
  const [loadingProductions, setLoadingProductions] = useState(false);

  const activeEvents = useMemo(() => {
    const events = session?.events ?? [];
    return [...events].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [session]);

  useEffect(() => {
    const last = window.localStorage.getItem("boothos-last-business") ?? "";
    setLoginEmail(last);
    void loadSession();
  }, []);

  async function loadSession() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/business", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as BusinessSession;
        setSession(data);
        setLoginEmail(data.user?.email ?? "");
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as BusinessSession & { error?: string };
      if (!res.ok) {
        setError(data.error || "Invalid credentials.");
        setSession(null);
        return;
      }
      setSession(data);
      setLoginPassword("");
      window.localStorage.setItem("boothos-last-business", loginEmail);
    } catch {
      setError("Could not reach the server.");
    }
  }

  async function registerAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          businessName: newBusinessName || "My Business",
          businessSlug: newBusinessSlug || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as BusinessSession & { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        return;
      }
      setMessage("Account created. Please sign in.");
      setRegistering(false);
    } catch {
      setError("Could not create account.");
    }
  }

  async function logout() {
    await fetch("/api/auth/business", { method: "DELETE", credentials: "include" });
    await fetch("/api/auth/event", { method: "DELETE", credentials: "include" });
    setSession(null);
    setProductions({});
    setResendEmail({});
  }

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/business/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newEventName,
          slug: newEventSlug || undefined,
          accessCode: newEventKey || undefined,
          plan: newPlan,
          mode: newMode,
          allowBackgroundRemoval: newAllowBgRemoval,
          allowAiBackgrounds: newAllowAiBg,
          allowAiFilters: newAllowAiFilters,
          deliveryEmail: true,
          deliverySms: newDeliverySms,
          overlayTheme: newOverlayTheme,
          galleryPublic: newGalleryPublic,
          eventDate: newEventDate || undefined,
          eventTime: newEventTime || undefined,
          allowedSelections: newMode === "photographer" ? newAllowedSelections : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        event?: EventItem;
        accessCode?: string;
        error?: string;
      };
      if (!res.ok || !data.event) {
        setError(data.error || "Could not create event.");
        return;
      }
      setSession({
        ...session,
        events: [data.event, ...session.events],
      });
      setMessage(`Created event "${data.event.name}". Save this key: ${data.accessCode}`);
      setNewEventName("");
      setNewEventSlug("");
      setNewEventKey("");
      setNewPlan("event-basic");
      setNewMode("self-serve");
      setNewAllowedSelections(3);
      setNewAllowBgRemoval(true);
      setNewAllowAiBg(false);
      setNewAllowAiFilters(false);
      setNewDeliverySms(false);
      setNewGalleryPublic(false);
      setNewOverlayTheme("default");
      setNewEventDate("");
      setNewEventTime("");
    } catch {
      setError("Could not create event.");
    }
  }

  async function rotateKey(eventId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/business/events/${eventId}/rotate`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { event?: EventItem; accessCode?: string; error?: string };
      if (!res.ok || !data.event || !data.accessCode) {
        setError(data.error || "Failed to rotate key.");
        return;
      }
      setSession((prev) =>
        prev
          ? {
              ...prev,
              events: prev.events.map((ev) => (ev.id === eventId ? { ...ev, ...data.event } : ev)),
            }
          : prev,
      );
      setIssuingKey((prev) => ({ ...prev, [eventId]: data.accessCode! }));
      setMessage("New event key issued. Share it with staff.");
    } catch {
      setError("Failed to rotate key.");
    }
  }

  async function updateStatus(eventId: string, status: "live" | "closed" | "draft") {
    setError(null);
    try {
      const res = await fetch(`/api/business/events/${eventId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => ({}))) as { event?: EventItem; error?: string };
      if (!res.ok || !data.event) {
        setError(data.error || "Failed to update event.");
        return;
      }
      setSession((prev) =>
        prev
          ? {
              ...prev,
              events: prev.events.map((ev) => (ev.id === eventId ? { ...ev, ...data.event } : ev)),
            }
          : prev,
      );
      setMessage(`Event "${data.event.name}" is now ${data.event.status}.`);
    } catch {
      setError("Failed to update event.");
    }
  }

  async function loadProductions(eventSlug: string) {
    if (!session) return;
    setLoadingProductions(true);
    setError(null);
    setProductionEvent(eventSlug);
    try {
      const res = await fetch(
        `/api/production?business=${session.business.slug}&event=${eventSlug}`,
        { credentials: "include" },
      );
      const data = (await res.json().catch(() => ({}))) as { items?: ProductionItem[]; error?: string };
      if (!res.ok || !data.items) {
        setError(data.error || "Failed to load deliveries.");
        return;
      }
      setProductions((prev) => ({ ...prev, [eventSlug]: data.items! }));
    } catch {
      setError("Failed to load deliveries.");
    } finally {
      setLoadingProductions(false);
    }
  }

  async function resend(id: string, eventSlug: string) {
    if (!session) return;
    const email = resendEmail[id];
    if (!email) {
      setError("Enter an email to resend.");
      return;
    }
    setError(null);
    setMessage(null);
    const res = await fetch(
      `/api/production/resend?business=${session.business.slug}&event=${eventSlug}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, email }),
      },
    );
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error || "Failed to resend email.");
      return;
    }
    setMessage("Resent photos.");
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setMessage("Copied to clipboard.");
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12 text-[var(--color-text-muted)]">
        <p>Loading business console…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Business Console</p>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--color-text)]">
                {registering ? "Create account" : "Sign in"}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                {registering
                  ? "Spin up a business and your first event in minutes."
                  : "Use your email and password to manage events, links, and gallery."}
              </p>
            </div>
            <button
              onClick={() => setRegistering((v) => !v)}
              className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
            >
              {registering ? "Have an account? Sign in" : "New here? Create one"}
            </button>
          </div>
          {error && (
            <div className="mt-3 rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]">
              {error}
            </div>
          )}
          <form onSubmit={registering ? registerAccount : login} className="mt-4 space-y-3">
            {registering && (
              <>
                <label className="block text-sm text-[var(--color-text-muted)]">
                  Business name
                  <input
                    required
                    value={newBusinessName}
                    onChange={(e) => setNewBusinessName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                    placeholder="Aurora Booths"
                  />
                </label>
                <label className="block text-sm text-[var(--color-text-muted)]">
                  Business slug (optional)
                  <input
                    value={newBusinessSlug}
                    onChange={(e) => setNewBusinessSlug(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                    placeholder="aurora-booths"
                  />
                </label>
              </>
            )}
            <label className="block text-sm text-[var(--color-text-muted)]">
              Email
              <input
                required
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm text-[var(--color-text-muted)]">
              Password
              <input
                required
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                placeholder="••••••••"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)]"
            >
              {registering ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Business Console</p>
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">
            {session.business.name}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Slug: {session.business.slug} • Signed in as {session.user?.email ?? "user"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSession}
            className="rounded-full bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
          >
            Refresh
          </button>
          <button
            onClick={logout}
            className="rounded-full bg-[var(--color-danger)]/90 px-3 py-2 text-xs font-semibold text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]"
          >
            Sign out
          </button>
        </div>
      </div>

      {(message || error) && (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ring-1 ${
            error
              ? "bg-[var(--color-danger-soft)] text-[var(--color-text)] ring-[rgba(249,115,115,0.35)]"
              : "bg-[var(--color-success-soft)] text-[var(--color-text)] ring-[rgba(34,197,94,0.35)]"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="mt-6 grid gap-4 rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Create event</p>
            <h2 className="text-xl font-semibold">Spin up a new event</h2>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Keys are shown once; rotate anytime.
          </p>
        </div>
        <form onSubmit={createEvent} className="grid gap-3 md:grid-cols-3">
          <input
            required
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            placeholder="Event name (e.g., Winter Gala)"
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
          />
          <input
            value={newEventSlug}
            onChange={(e) => setNewEventSlug(e.target.value)}
            placeholder="Slug (optional)"
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
          />
          <input
            value={newEventKey}
            onChange={(e) => setNewEventKey(e.target.value)}
            placeholder="Event access key (optional)"
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
          />
          <select
            value={newMode}
            onChange={(e) => setNewMode(e.target.value as "self-serve" | "photographer")}
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
          >
            <option value="self-serve">Self-service booth</option>
            <option value="photographer">Photographer mode</option>
          </select>
          <select
            value={newPlan}
            onChange={(e) => setNewPlan(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
          >
            {newMode === "self-serve" ? (
              <>
                <option value="free">Free (50 photos, basic overlays)</option>
                <option value="event-basic">$10 / 100 photos</option>
                <option value="event-unlimited">$20 / unlimited</option>
                <option value="event-ai">$30 / unlimited + AI backgrounds</option>
              </>
            ) : (
              <>
                <option value="photographer-single">$100 photographer event</option>
                <option value="photographer-monthly">$250 photographer monthly</option>
              </>
            )}
          </select>
          <select
            value={newOverlayTheme}
            onChange={(e) => setNewOverlayTheme(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
          >
            <option value="default">Overlay: Default</option>
            <option value="wedding">Overlay: Wedding</option>
            <option value="birthday">Overlay: Birthday</option>
            <option value="military">Overlay: Military Ball</option>
            <option value="christmas">Overlay: Christmas</option>
            <option value="valentines">Overlay: Valentines</option>
          </select>
          <input
            value={newEventDate}
            onChange={(e) => setNewEventDate(e.target.value)}
            placeholder="Event date (optional)"
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
          />
          <input
            value={newEventTime}
            onChange={(e) => setNewEventTime(e.target.value)}
            placeholder="Event time (optional)"
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
          />
          {newMode === "photographer" && (
            <input
              type="number"
              min={1}
              value={newAllowedSelections}
              onChange={(e) => setNewAllowedSelections(Number(e.target.value) || 1)}
              placeholder="Selections per guest"
              className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
            />
          )}
          <div className="md:col-span-3 flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newAllowBgRemoval}
                onChange={(e) => setNewAllowBgRemoval(e.target.checked)}
              />
              Background removal
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newAllowAiBg}
                onChange={(e) => setNewAllowAiBg(e.target.checked)}
              />
              AI backgrounds (uses credits)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newAllowAiFilters}
                onChange={(e) => setNewAllowAiFilters(e.target.checked)}
              />
              AI filters (future)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newDeliverySms}
                onChange={(e) => setNewDeliverySms(e.target.checked)}
              />
              Enable SMS delivery (placeholder)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newGalleryPublic}
                onChange={(e) => setNewGalleryPublic(e.target.checked)}
              />
              Public gallery
            </label>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)]"
            >
              Create event
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Events</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Copy the links and share with your staff. If you’re logged in, no event key is needed.
          </p>
        </div>
        {activeEvents.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No events yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeEvents.map((event) => {
              const usage = usageFor(event);
              const checkin = linkFor("/checkin", session.business.slug, event.slug);
              const photographer = linkFor("/photographer", session.business.slug, event.slug);
              const frontdesk = linkFor("/frontdesk", session.business.slug, event.slug);
              const booth = linkFor(`/event/${event.slug}`, session.business.slug, event.slug);
              return (
                <div
                  key={event.id}
                  className="rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{event.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Slug: {event.slug} • Created {event.createdAt ? new Date(event.createdAt).toLocaleDateString() : ""}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Mode: {event.mode ?? "self-serve"} • Plan: {event.plan ?? "event-basic"} • Overlay:{" "}
                        {event.overlayTheme ?? "default"}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-soft)]">
                        Access key hint: {event.accessHint ?? "—"}
                      </p>
                      {issuingKey[event.id] && (
                        <p className="mt-1 text-[11px] text-[var(--color-success)]">
                          New key: {issuingKey[event.id]}
                        </p>
                      )}
                      {event.mode === "photographer" && (
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          Payment: {event.paymentStatus ?? "unpaid"} • Allowed selections:{" "}
                          {event.allowedSelections ?? 3}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${
                          event.status === "closed"
                            ? "bg-[rgba(249,115,115,0.16)] text-[var(--color-text)] ring-[rgba(249,115,115,0.35)]"
                            : "bg-[rgba(34,197,94,0.14)] text-[var(--color-text)] ring-[rgba(34,197,94,0.35)]"
                        }`}
                      >
                        {event.status ?? "live"}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-2 text-xs">
                    <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-text-muted)]">
                      <span>
                        Photos: {usage.photoUsed}
                        {usage.photoCap === null ? " / ∞" : ` / ${usage.photoCap}`} (remaining{" "}
                        {usage.remainingPhotos === null ? "∞" : usage.remainingPhotos})
                      </span>
                      <span>
                        AI credits: {usage.aiUsed} / {usage.aiCredits} (remaining {usage.remainingAi})
                      </span>
                    </div>
                    {[
                      { label: "Check-in link", href: checkin },
                      { label: "Photographer link", href: photographer },
                      { label: "Front desk link", href: frontdesk },
                      { label: "Booth link", href: booth },
                    ].map((link) => (
                      <button
                        key={link.label}
                        onClick={() => copy(link.href)}
                        className="flex items-center justify-between rounded-xl bg-[var(--color-surface-elevated)] px-3 py-2 text-left ring-1 ring-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]"
                      >
                        <div>
                          <p className="text-[11px] text-[var(--color-text-muted)]">{link.label}</p>
                          <p className="truncate font-mono text-[11px] text-[var(--color-text)]">{link.href}</p>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-soft)]">Copy</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      onClick={() => rotateKey(event.id)}
                      className="rounded-full bg-[var(--color-primary)] px-3 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_10px_25px_rgba(155,92,255,0.3)]"
                    >
                      Rotate access key
                    </button>
                    {event.status === "closed" ? (
                      <button
                        onClick={() => updateStatus(event.id, "live")}
                        className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(event.id, "closed")}
                        className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                      >
                        Close event
                      </button>
                    )}
                    <button
                      onClick={() => loadProductions(event.slug)}
                      className="rounded-full bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                    >
                      View deliveries
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Deliveries</p>
            <h2 className="text-xl font-semibold text-[var(--color-text)]">Resend & manage</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            {session.events.map((ev) => (
              <button
                key={ev.id}
                onClick={() => loadProductions(ev.slug)}
                className={`rounded-full px-3 py-2 ring-1 ${
                  productionEvent === ev.slug
                    ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] ring-[var(--color-primary)]"
                    : "bg-[var(--color-surface-elevated)] text-[var(--color-text)] ring-[var(--color-border-subtle)]"
                }`}
              >
                {ev.name}
              </button>
            ))}
          </div>
        </div>
        {loadingProductions ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Loading deliveries…</p>
        ) : productionEvent && productions[productionEvent]?.length ? (
          <div className="mt-4 space-y-3">
            {productions[productionEvent]?.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{item.email}</p>
                    <p className="text-[11px] text-[var(--color-text-soft)]">
                      Sent {new Date(item.createdAt).toLocaleString()}
                    </p>
                    {item.tokenExpiresAt && (
                      <p className="text-[11px] text-[var(--color-text-soft)]">
                        Link expires {new Date(item.tokenExpiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="Resend to"
                      value={resendEmail[item.id] ?? ""}
                      onChange={(e) =>
                        setResendEmail((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--input-placeholder)]"
                    />
                    <button
                      onClick={() => resend(item.id, productionEvent)}
                      className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-on-primary)] shadow-[0_10px_25px_rgba(155,92,255,0.3)]"
                    >
                      Resend
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                  {item.attachments.length} file(s) •{" "}
                  {item.downloadToken ? "Tokenized download ready" : "No download token"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Select an event to view deliveries.</p>
        )}
      </section>

      <section className="mt-8 rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Staff links</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Share these with your team. When they are signed in as the business, they won’t be prompted for an event key.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            href="/photographer"
            className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 ring-1 ring-[var(--color-border-subtle)]"
          >
            Photographer console
          </Link>
          <Link
            href="/frontdesk"
            className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 ring-1 ring-[var(--color-border-subtle)]"
          >
            Front desk console
          </Link>
          <Link
            href="/checkin"
            className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 ring-1 ring-[var(--color-border-subtle)]"
          >
            Check-in kiosk
          </Link>
        </div>
      </section>
    </main>
  );
}
