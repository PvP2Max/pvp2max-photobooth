"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

type BusinessSession = {
  business: {
    id: string;
    name: string;
    slug: string;
    apiKeyHint?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
  };
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
  downloadCount?: number;
  lastDownloadedAt?: string;
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

function overlayLabel(theme?: string) {
  switch (theme) {
    case "none":
    case undefined:
      return "None";
    case "custom-request":
      return "Custom overlay by Arctic Aura Designs";
    default:
      return "Custom";
  }
}

export default function BusinessConsole() {
  const router = useRouter();
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
  const [newEventKey, setNewEventKey] = useState("");
  const [newPlan, setNewPlan] = useState("event-basic");
  const [newMode, setNewMode] = useState<"self-serve" | "photographer">("self-serve");
  const [newAllowedSelections, setNewAllowedSelections] = useState(3);
  const [newAllowBgRemoval, setNewAllowBgRemoval] = useState(true);
  const [newAllowAiBg, setNewAllowAiBg] = useState(false);
  const [newAllowAiFilters, setNewAllowAiFilters] = useState(false);
  const [newDeliverySms, setNewDeliverySms] = useState(false);
  const [newGalleryPublic, setNewGalleryPublic] = useState(false);
  const [newOverlayTheme, setNewOverlayTheme] = useState("none");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [issuingKey, setIssuingKey] = useState<Record<string, string>>({});
  const [resendEmail, setResendEmail] = useState<Record<string, string>>({});
  const [productionEvent, setProductionEvent] = useState<string>("");
  const [productions, setProductions] = useState<Record<string, ProductionItem[]>>({});
  const [loadingProductions, setLoadingProductions] = useState(false);
  const [selectionEmails, setSelectionEmails] = useState<Record<string, string>>({});
  const [selectionLinks, setSelectionLinks] = useState<Record<string, string>>({});
  const [selectionStatus, setSelectionStatus] = useState<Record<string, string>>({});
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [qrLabel, setQrLabel] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "events" | "deliveries" | "staff">("overview");
  const [copiedLink, setCopiedLink] = useState<Record<string, boolean>>({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const navIcons: Record<"overview" | "events" | "deliveries", ReactNode> = {
    overview: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    events: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    deliveries: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4.5 5h15a.5.5 0 0 1 .4.8L12 15 4.1 5.8A.5.5 0 0 1 4.5 5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M4 6.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  };
  const navTabs = useMemo(
    () => [
      { id: "overview" as const, label: "Overview" },
      { id: "events" as const, label: "Events" },
      { id: "deliveries" as const, label: "Deliveries" },
    ],
    [],
  );
  const mobileTabs = useMemo(
    () => [...navTabs, { id: "staff" as const, label: "Staff links" }],
    [navTabs],
  );
  const [sidebarCondensed, setSidebarCondensed] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const isSidebarWide = !sidebarCondensed || sidebarExpanded;
  const [testStream, setTestStream] = useState<MediaStream | null>(null);
  const [testVideoReady, setTestVideoReady] = useState(false);
  const [testCapture, setTestCapture] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testShowTips, setTestShowTips] = useState(false);
  const testVideoRef = useRef<HTMLVideoElement | null>(null);
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const defaultBgPreview = "/assets/defaults/backgrounds/Modern White Marble.png";

  const activeEvents = useMemo(() => {
    const events = session?.events ?? [];
    return [...events].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [session]);

  const stats = useMemo(() => {
    const events = session?.events ?? [];
    const live = events.filter((e) => e.status !== "closed");
    const closed = events.filter((e) => e.status === "closed");
    const photoUsed = events.reduce((sum, e) => sum + (e.photoUsed ?? 0), 0);
    const aiUsed = events.reduce((sum, e) => sum + (e.aiUsed ?? 0), 0);
    const photoCap = events.reduce((sum, e) => sum + (e.photoCap ?? 0), 0);
    const aiCap = events.reduce((sum, e) => sum + (e.aiCredits ?? 0), 0);
    return {
      liveEvents: live.length,
      closedEvents: closed.length,
      photoUsed,
      aiUsed,
      photoCap,
      aiCap,
    };
  }, [session]);

  useEffect(() => {
    async function fetchSession() {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/business", { credentials: "include" });
        if (!res.ok) {
          setSession(null);
          setLoading(false);
          return;
        }
        const data = (await res.json()) as BusinessSession;
        setSession(data);
      } catch (err) {
        console.error(err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    }
    void fetchSession();
  }, []);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = (await res.json()) as BusinessSession & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error || "Invalid credentials.");
        return;
      }
      setSession(data);
      setMessage("Signed in. Redirecting…");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Could not sign in. Try again.");
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
        credentials: "include",
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          businessName: newBusinessName,
          businessSlug: newBusinessSlug,
          eventName: newEventName,
          eventSlug: newEventKey,
        }),
      });
      const data = (await res.json()) as BusinessSession & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error || "Could not register.");
        return;
      }
      setSession(data);
      setMessage("Account created. Redirecting…");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Could not register. Try again.");
    }
  }

  function logout() {
    fetch("/api/auth/user", { method: "DELETE", credentials: "include" })
      .then(() => {
        setSession(null);
        router.refresh();
      })
      .catch(() => {});
  }

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const payload = {
      name: newEventName,
      slug: newEventKey,
      plan: newPlan,
      mode: newMode,
      allowedSelections: newAllowedSelections,
      allowBackgroundRemoval: newAllowBgRemoval,
      allowAiBackgrounds: newAllowAiBg,
      allowAiFilters: newAllowAiFilters,
      deliverySms: newDeliverySms,
      galleryPublic: newGalleryPublic,
      overlayTheme: newOverlayTheme,
      eventDate: newEventDate,
      eventTime: newEventTime,
    };
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; event?: EventItem };
      if (!res.ok || data.error) {
        setError(data.error || "Could not create event.");
        return;
      }
      setSession((prev) =>
        prev ? { ...prev, events: [data.event as EventItem, ...prev.events] } : prev,
      );
      setMessage("Event created.");
      setNewEventName("");
      setNewEventKey("");
      setNewPlan("event-basic");
      setNewMode("self-serve");
      setNewAllowedSelections(3);
      setNewAllowBgRemoval(true);
      setNewAllowAiBg(false);
      setNewAllowAiFilters(false);
      setNewDeliverySms(false);
      setNewGalleryPublic(false);
      setNewOverlayTheme("none");
      setNewEventDate("");
      setNewEventTime("");
      setCreateModalOpen(false);
    } catch (err) {
      console.error(err);
      setError("Could not create event.");
    }
  }

  async function rotateEventKey(eventSlug: string) {
    setIssuingKey((prev) => ({ ...prev, [eventSlug]: "Rotating…" }));
    try {
      const res = await fetch("/api/events/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventSlug }),
      });
      const data = (await res.json()) as { key?: string; error?: string };
      if (!res.ok || data.error) {
        setIssuingKey((prev) => ({ ...prev, [eventSlug]: data.error || "Failed" }));
        return;
      }
      setIssuingKey((prev) => ({ ...prev, [eventSlug]: data.key || "Updated" }));
    } catch (err) {
      console.error(err);
      setIssuingKey((prev) => ({ ...prev, [eventSlug]: "Failed" }));
    }
  }

  async function closeEvent(eventSlug: string, status: "closed" | "live") {
    try {
      const res = await fetch("/api/events/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventSlug, status }),
      });
      if (res.ok) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                events: prev.events.map((event) =>
                  event.slug === eventSlug ? { ...event, status } : event,
                ),
              }
            : prev,
        );
      }
    } catch {
      // ignore
    }
  }

  async function fetchProductions(eventSlug: string) {
    setLoadingProductions(true);
    try {
      const res = await fetch(`/api/productions?event=${eventSlug}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ProductionItem[];
      setProductions((prev) => ({ ...prev, [eventSlug]: data }));
      setProductionEvent(eventSlug);
    } catch {
      // ignore
    } finally {
      setLoadingProductions(false);
    }
  }

  async function resendEmail(productionId: string, eventSlug: string) {
    const email = resendEmail[eventSlug];
    if (!email) return;
    setSelectionStatus((prev) => ({ ...prev, [productionId]: "Sending…" }));
    try {
      const res = await fetch("/api/email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productionId, email }),
      });
      if (res.ok) {
        setSelectionStatus((prev) => ({ ...prev, [productionId]: "Sent" }));
      } else {
        setSelectionStatus((prev) => ({ ...prev, [productionId]: "Failed" }));
      }
    } catch {
      setSelectionStatus((prev) => ({ ...prev, [productionId]: "Failed" }));
    }
  }

  async function createSelectionLink(eventSlug: string) {
    const email = selectionEmails[eventSlug];
    if (!email) return;
    setSelectionStatus((prev) => ({ ...prev, [eventSlug]: "Sending…" }));
    try {
      const res = await fetch("/api/selections/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventSlug, email }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || data.error) {
        setSelectionStatus((prev) => ({ ...prev, [eventSlug]: data.error || "Failed" }));
        return;
      }
      setSelectionLinks((prev) => ({ ...prev, [eventSlug]: data.url || "" }));
      setSelectionStatus((prev) => ({ ...prev, [eventSlug]: "Sent" }));
    } catch {
      setSelectionStatus((prev) => ({ ...prev, [eventSlug]: "Failed" }));
    }
  }

  async function createCheckout(plan: string, eventSlug?: string) {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, eventSlug }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setCheckoutLoading(null);
        setError(data.error || "Could not start checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutLoading(null);
      setError("Could not start checkout.");
    }
  }

  async function generateQr(link: string, label: string) {
    try {
      const dataUrl = await QRCode.toDataURL(link);
      setQrData(dataUrl);
      setQrLink(link);
      setQrLabel(label);
    } catch {
      setQrData(null);
      setQrLink(null);
      setQrLabel(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-muted)]">
        Checking session…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
          <div className="rounded-3xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-soft)]">
              BoothOS Login
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Sign in or create your business</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Sign in to manage events, background assets, and deliveries. New here? Create a business and seed your
              first event.
            </p>

            {error && (
              <div className="mt-3 rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-3 rounded-xl bg-[var(--color-success-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]">
                {message}
              </div>
            )}

            <form onSubmit={registering ? registerAccount : login} className="mt-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-[var(--color-text-muted)]">
                  Email
                  <input
                    required
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                  />
                </label>
                <label className="text-sm text-[var(--color-text-muted)]">
                  Password
                  <input
                    required
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                  />
                </label>
              </div>

              {registering && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-[var(--color-text-muted)]">
                    Business name
                    <input
                      required
                      value={newBusinessName}
                      onChange={(e) => setNewBusinessName(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                    />
                  </label>
                  <label className="text-sm text-[var(--color-text-muted)]">
                    Business slug
                    <input
                      required
                      value={newBusinessSlug}
                      onChange={(e) => setNewBusinessSlug(e.target.value)}
                      placeholder="your-company"
                      className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                    />
                  </label>
                  <label className="text-sm text-[var(--color-text-muted)]">
                    Event name
                    <input
                      required
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                    />
                  </label>
                  <label className="text-sm text-[var(--color-text-muted)]">
                    Event slug
                    <input
                      required
                      value={newEventKey}
                      onChange={(e) => setNewEventKey(e.target.value)}
                      placeholder="holiday-2025"
                      className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-[var(--gradient-brand)] px-5 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
                >
                  {registering ? "Create business" : "Sign in"}
                </button>
                <button
                  type="button"
                  onClick={() => setRegistering((prev) => !prev)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
                >
                  {registering ? "Use existing account" : "Create a new business instead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="grid min-h-screen gap-6 px-4 py-6 lg:grid-cols-[280px,1fr]">
        <aside
          className={`rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 transition-all ${
            isSidebarWide ? "w-full" : "w-[80px]"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] ring-1 ring-[var(--color-border-subtle)]">
                <span className="text-lg font-semibold text-[var(--color-primary)]">B</span>
              </div>
              {isSidebarWide && (
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {session.business.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">{session.user?.email}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCondensed((prev) => !prev)}
              className="rounded-full px-3 py-1 text-xs text-[var(--color-text-muted)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
            >
              {isSidebarWide ? "Condense" : "Expand"}
            </button>
          </div>

          <div className="mt-6 space-y-2">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  view === tab.id
                    ? "bg-[var(--color-surface-elevated)] text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"
                }`}
              >
                {navIcons[tab.id]}
                {isSidebarWide && <span>{tab.label}</span>}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
            >
              <span>Account</span>
              <span>{profileOpen ? "–" : "+"}</span>
            </button>
            {profileOpen && (
              <div className="space-y-2 rounded-xl bg-[var(--color-surface-elevated)] p-3 text-sm ring-1 ring-[var(--color-border-subtle)]">
                <p className="text-[var(--color-text-muted)]">Email: {session.user?.email}</p>
                <p className="text-[var(--color-text-muted)]">Plan: {session.business.subscriptionPlan ?? "Event-based"}</p>
                <button
                  onClick={logout}
                  className="w-full rounded-full bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]/80"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-soft)]">
                BoothOS dashboard
              </p>
              <h1 className="text-2xl font-semibold text-[var(--color-text)]">Events & delivery</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="rounded-full bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
              >
                Create event
              </button>
              <button
                onClick={() => router.push("/frontdesk")}
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
              >
                Front desk
              </button>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border-subtle)] md:grid-cols-2 lg:grid-cols-4">
            <Stat label="Live events" value={stats.liveEvents} />
            <Stat label="Closed events" value={stats.closedEvents} />
            <Stat label="Photos used" value={stats.photoUsed} />
            <Stat label="AI credits used" value={stats.aiUsed} />
          </div>

          {view === "overview" && (
            <div className="space-y-4 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Active events</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {activeEvents.map((event) => {
                  const usage = usageFor(event);
                  const boothLink = linkFor("/event", session.business.slug, event.slug);
                  const checkinLink = linkFor("/checkin", session.business.slug, event.slug);
                  const photographerLink = linkFor("/photographer", session.business.slug, event.slug);
                  const frontdeskLink = linkFor("/frontdesk", session.business.slug, event.slug);
                  return (
                    <div
                      key={event.id}
                      className="space-y-3 rounded-xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text)]">{event.name}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">
                            {event.slug}
                          </p>
                        </div>
                        <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-[11px] text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]">
                          {event.status === "closed" ? "Closed" : "Live"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-text-muted)]">
                        <div>
                          <p>Plan</p>
                          <p className="font-semibold text-[var(--color-text)]">{event.plan ?? "Event-based"}</p>
                        </div>
                        <div>
                          <p>Mode</p>
                          <p className="font-semibold text-[var(--color-text)]">{event.mode ?? "self-serve"}</p>
                        </div>
                        <div>
                          <p>Photos</p>
                          <p className="font-semibold text-[var(--color-text)]">
                            {usage.photoCap === null ? "Unlimited" : `${usage.photoUsed ?? 0}/${usage.photoCap}`}
                          </p>
                        </div>
                        <div>
                          <p>AI credits</p>
                          <p className="font-semibold text-[var(--color-text)]">
                            {usage.aiCredits === undefined ? "—" : `${usage.aiUsed}/${usage.aiCredits}`}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 text-xs text-[var(--color-text-muted)]">
                        <LinkRow label="Booth" href={boothLink} />
                        <LinkRow label="Check-in" href={checkinLink} />
                        <LinkRow label="Photographer" href={photographerLink} />
                        <LinkRow label="Front desk" href={frontdeskLink} />
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          onClick={() => closeEvent(event.slug, event.status === "closed" ? "live" : "closed")}
                          className="rounded-full bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]/80"
                        >
                          {event.status === "closed" ? "Reopen event" : "Close event"}
                        </button>
                        <button
                          onClick={() => rotateEventKey(event.slug)}
                          className="rounded-full bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]/80"
                        >
                          {issuingKey[event.slug] ?? "Rotate key"}
                        </button>
                        <button
                          onClick={() => createCheckout("event-basic", event.slug)}
                          className="rounded-full bg-[var(--gradient-brand)] px-3 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
                        >
                          Buy event plan
                        </button>
                        <button
                          onClick={() => createSelectionLink(event.slug)}
                          className="rounded-full px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
                        >
                          Send selection link
                        </button>
                      </div>

                      <div className="space-y-2 text-xs text-[var(--color-text-muted)]">
                        <label className="flex flex-col gap-2">
                          Selection email
                          <input
                            type="email"
                            value={selectionEmails[event.slug] || ""}
                            onChange={(e) =>
                              setSelectionEmails((prev) => ({ ...prev, [event.slug]: e.target.value }))
                            }
                            className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                          />
                        </label>
                        {selectionLinks[event.slug] && (
                          <div className="rounded-xl bg-[var(--color-bg-subtle)] px-3 py-2 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]">
                            {selectionLinks[event.slug]}
                          </div>
                        )}
                        {selectionStatus[event.slug] && (
                          <p className="text-[var(--color-text-muted)]">{selectionStatus[event.slug]}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {activeEvents.length === 0 && (
                  <div className="rounded-xl bg-[var(--color-surface-elevated)] p-4 text-sm text-[var(--color-text-muted)] ring-1 ring-[var(--color-border-subtle)]">
                    No events yet. Create one to get started.
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "events" && (
            <div className="space-y-3 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Events</h2>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="rounded-full bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
                >
                  Create event
                </button>
              </div>
              <div className="grid gap-2">
                {session.events.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-elevated)] p-4 text-sm text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{event.name}</p>
                      <p className="text-[var(--color-text-muted)]">{event.slug}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => rotateEventKey(event.slug)}
                        className="rounded-full bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]/80"
                      >
                        {issuingKey[event.slug] ?? "Rotate key"}
                      </button>
                      <button
                        onClick={() => closeEvent(event.slug, event.status === "closed" ? "live" : "closed")}
                        className="rounded-full px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
                      >
                        {event.status === "closed" ? "Reopen" : "Close"}
                      </button>
                    </div>
                  </div>
                ))}
                {session.events.length === 0 && (
                  <div className="rounded-xl bg-[var(--color-surface-elevated)] p-4 text-sm text-[var(--color-text-muted)] ring-1 ring-[var(--color-border-subtle)]">
                    No events yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "deliveries" && (
            <div className="space-y-3 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Deliveries</h2>
                <div className="flex flex-wrap gap-2">
                  {session.events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => fetchProductions(event.slug)}
                      className={`rounded-full px-3 py-2 text-sm font-semibold ring-1 ring-[var(--color-border-subtle)] transition ${
                        productionEvent === event.slug
                          ? "bg-[var(--color-surface-elevated)] text-[var(--color-text)]"
                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"
                      }`}
                    >
                      {event.name}
                    </button>
                  ))}
                </div>
              </div>

              {loadingProductions && (
                <p className="text-sm text-[var(--color-text-muted)]">Loading deliveries…</p>
              )}

              {productionEvent && (
                <div className="grid gap-2">
                  {(productions[productionEvent] ?? []).map((prod) => (
                    <div
                      key={prod.id}
                      className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-elevated)] p-4 text-sm text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-semibold">{prod.email}</p>
                        <p className="text-[var(--color-text-muted)]">
                          {new Date(prod.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="email"
                          placeholder="Resend to email"
                          value={resendEmail[prod.id] || ""}
                          onChange={(e) =>
                            setResendEmail((prev) => ({ ...prev, [prod.id]: e.target.value }))
                          }
                          className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                        />
                        <button
                          onClick={() => resendEmail(prod.id, productionEvent)}
                          className="rounded-full bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]/80"
                        >
                          Resend
                        </button>
                        {selectionStatus[prod.id] && (
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {selectionStatus[prod.id]}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(productions[productionEvent] ?? []).length === 0 && (
                    <div className="rounded-xl bg-[var(--color-surface-elevated)] p-4 text-sm text-[var(--color-text-muted)] ring-1 ring-[var(--color-border-subtle)]">
                      No deliveries yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4">
          <div className="w-full max-w-2xl space-y-4 rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create event</h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Close
              </button>
            </div>
            <form onSubmit={createEvent} className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-[var(--color-text-muted)]">
                Event name
                <input
                  required
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
              <label className="text-sm text-[var(--color-text-muted)]">
                Event slug
                <input
                  required
                  value={newEventKey}
                  onChange={(e) => setNewEventKey(e.target.value)}
                  placeholder="event-2025"
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
              <label className="text-sm text-[var(--color-text-muted)]">
                Plan
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
                >
                  <option value="event-basic">Event Basic ($10)</option>
                  <option value="event-unlimited">Event Unlimited ($20)</option>
                  <option value="event-ai">Event AI ($30)</option>
                  <option value="photographer-event">Photographer Event ($100)</option>
                  <option value="photographer-monthly">Photographer Monthly ($250)</option>
                </select>
              </label>
              <label className="text-sm text-[var(--color-text-muted)]">
                Mode
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as "self-serve" | "photographer")}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
                >
                  <option value="self-serve">Self-serve</option>
                  <option value="photographer">Photographer</option>
                </select>
              </label>
              <label className="text-sm text-[var(--color-text-muted)]">
                Allowed selections (photographer mode)
                <input
                  type="number"
                  min={1}
                  value={newAllowedSelections}
                  onChange={(e) => setNewAllowedSelections(Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
              <label className="text-sm text-[var(--color-text-muted)]">
                Event date
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
              <label className="text-sm text-[var(--color-text-muted)]">
                Event time
                <input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={newAllowBgRemoval}
                  onChange={(e) => setNewAllowBgRemoval(e.target.checked)}
                />
                Allow background removal
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={newAllowAiBg}
                  onChange={(e) => setNewAllowAiBg(e.target.checked)}
                />
                Allow AI backgrounds
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={newAllowAiFilters}
                  onChange={(e) => setNewAllowAiFilters(e.target.checked)}
                />
                Allow AI filters
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={newDeliverySms}
                  onChange={(e) => setNewDeliverySms(e.target.checked)}
                />
                Enable SMS (coming soon)
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={newGalleryPublic}
                  onChange={(e) => setNewGalleryPublic(e.target.checked)}
                />
                Public gallery
              </label>
              <label className="text-sm text-[var(--color-text-muted)] md:col-span-2">
                Overlay theme
                <select
                  value={newOverlayTheme}
                  onChange={(e) => setNewOverlayTheme(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="custom-request">Custom (Arctic Aura Designs)</option>
                </select>
              </label>
              <div className="md:col-span-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[var(--gradient-brand)] px-5 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
                >
                  Save event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-[var(--color-surface)] p-6 text-center text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-text-soft)]">{qrLabel}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrData} alt="QR code" className="mx-auto h-48 w-48" />
            <p className="break-all text-xs text-[var(--color-text-muted)]">{qrLink}</p>
            <button
              onClick={() => {
                setQrData(null);
                setQrLink(null);
                setQrLabel(null);
              }}
              className="w-full rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] p-3 ring-1 ring-[var(--color-border-subtle)]">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">{label}</p>
      <p className="text-2xl font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-lg bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
    >
      <span>{label}</span>
      <span className="text-[var(--color-text-muted)]">→</span>
    </a>
  );
}
