"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Stat } from "./console/Stat";
import { LinkActions } from "./console/LinkActions";
import { BackgroundTester } from "./console/BackgroundTester";
import { CreateEventModal } from "./console/CreateEventModal";
import { QrModal } from "./console/QrModal";

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
  roles?: { collaborator?: string[] };
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
  const base =
    (typeof window !== "undefined" && window.location?.origin) ||
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    process.env.APP_BASE_URL ||
    "";
  // Ensure pathname has leading slash
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}?${qs}`;
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

export default function BusinessConsole() {
  const router = useRouter();
  const [session, setSession] = useState<BusinessSession | null>({
    business: { id: "", name: "", slug: "" },
    events: [],
  });
  const [loading, setLoading] = useState(false);
  const businessSlug = "";
  const [_error, setError] = useState<string | null>(null);
  const [_message, setMessage] = useState<string | null>(null);
  const [newEventName, setNewEventName] = useState("");
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
  const [resendEmailMap, setResendEmailMap] = useState<Record<string, string>>({});
  const [productionEvent, setProductionEvent] = useState<string>("");
  const [productions, setProductions] = useState<Record<string, ProductionItem[]>>({});
  const [loadingProductions, setLoadingProductions] = useState(false);
  const [selectionEmails, setSelectionEmails] = useState<Record<string, string>>({});
  const [selectionLinks, setSelectionLinks] = useState<Record<string, string>>({});
  const [selectionStatus, setSelectionStatus] = useState<Record<string, string>>({});
  const [collaboratorInputs, setCollaboratorInputs] = useState<Record<string, string>>({});
  const [rolesStatus, setRolesStatus] = useState<Record<string, string>>({});
  const [_checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [qrLabel, setQrLabel] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "events" | "deliveries">("overview");
  const [_copiedLink, _setCopiedLink] = useState<Record<string, boolean>>({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
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
  const [sidebarCondensed, setSidebarCondensed] = useState(false);
  const isSidebarWide = !sidebarCondensed || sidebarExpanded;
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeEvents = useMemo(() => {
    const events = session?.events ?? [];
    return [...events].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [session]);

  const isPhotographer = useMemo(() => {
    const plan = session?.business.subscriptionPlan ?? "";
    const hasPhotogEvent = (session?.events ?? []).some((e) => e.plan?.startsWith("photographer"));
    return plan.includes("photographer") || hasPhotogEvent;
  }, [session]);
  const hasPhotographerSubscription = useMemo(() => {
    const plan = session?.business.subscriptionPlan ?? "";
    const status = session?.business.subscriptionStatus ?? "";
    return plan.includes("photographer") && status === "active";
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
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      try {
        const res = await fetch(`/api/events`, { credentials: "include" });
        if (!res.ok) {
          setSession(null);
          setLoading(false);
          return;
        }
        const data = (await res.json()) as {
          events?: EventItem[];
          business?: { id: string; name: string; slug: string };
        };
        setSession({
          business: data.business ?? { id: "", name: "My BoothOS", slug: "" },
          events: data.events ?? [],
        });
      } catch (err) {
        console.error(err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    }
    void loadEvents();
  }, [businessSlug]);

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
      const res = await fetch(`/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      const res = await fetch(`/api/events/key?business=${encodeURIComponent(businessSlug)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-boothos-business": businessSlug,
        },
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
      const res = await fetch(`/api/events/status?business=${encodeURIComponent(businessSlug)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-boothos-business": businessSlug,
        },
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

  async function deleteEvent(eventId: string) {
    if (!window.confirm("Delete this event and all its files now? This cannot be undone.")) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/delete?business=${encodeURIComponent(businessSlug)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-boothos-business": businessSlug,
        },
        credentials: "include",
        body: JSON.stringify({ eventId }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok || payload.error) {
        throw new Error(payload.error || "Could not delete event.");
      }
      setSession((prev) =>
        prev ? { ...prev, events: prev.events.filter((e) => e.id !== eventId) } : prev,
      );
      setMessage("Event deleted and storage removed.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete event.";
      setError(msg);
    }
  }

  async function saveRoles(eventSlug: string) {
    const collaboratorRaw = collaboratorInputs[eventSlug] || "";
    const collaboratorEmails = collaboratorRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setRolesStatus((prev) => ({ ...prev, [eventSlug]: "Saving…" }));
    try {
      const res = await fetch(`/api/events/roles?business=${encodeURIComponent(businessSlug)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-boothos-business": businessSlug,
        },
        credentials: "include",
        body: JSON.stringify({ eventSlug, collaboratorEmails }),
      });
      const data = (await res.json().catch(() => ({}))) as { event?: EventItem; error?: string };
      if (!res.ok || data.error || !data.event) {
        setRolesStatus((prev) => ({ ...prev, [eventSlug]: data.error || "Failed" }));
        return;
      }
      setSession((prev) =>
        prev
          ? {
              ...prev,
              events: prev.events.map((e) =>
                e.slug === eventSlug ? { ...e, roles: data.event?.roles ?? {} } : e,
              ),
            }
          : prev,
      );
      setRolesStatus((prev) => ({ ...prev, [eventSlug]: "Saved" }));
    } catch (err) {
      console.error(err);
      setRolesStatus((prev) => ({ ...prev, [eventSlug]: "Failed" }));
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

  async function resendDeliveryEmail(productionId: string, eventSlug: string) {
    const email = resendEmailMap[eventSlug];
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

  function copyLink(key: string, url: string) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopyStatus((prev) => ({ ...prev, [key]: true }));
        window.setTimeout(() => setCopyStatus((prev) => ({ ...prev, [key]: false })), 1500);
      })
      .catch(() => {});
  }

  async function generateCheckinGraphic(checkinUrl: string, eventName: string): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    // Background gradient (purple to cyan)
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(1, '#0a1628');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // "Check-in Here" text
    ctx.font = 'bold 72px system-ui';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Check-in Here', 540, 300);

    // Event name
    ctx.font = '48px system-ui';
    ctx.fillStyle = '#a3aac7';
    ctx.fillText(eventName, 540, 380);

    // QR Code
    const qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 600, margin: 2 });
    const qrImg = new Image();
    await new Promise(r => { qrImg.onload = r; qrImg.src = qrDataUrl; });
    ctx.drawImage(qrImg, 240, 500, 600, 600);

    // "Scan to check in" text
    ctx.font = '36px system-ui';
    ctx.fillStyle = '#7b81a3';
    ctx.fillText('Scan to check in', 540, 1200);

    // BoothOS branding at bottom
    ctx.font = 'bold 42px system-ui';
    ctx.fillStyle = '#9b5cff';
    ctx.fillText('BoothOS', 540, 1800);

    return canvas.toDataURL('image/png');
  }

  async function downloadCheckinGraphic(eventSlug: string, eventName: string) {
    const checkinLink = linkFor("/checkin", session?.business.slug || "", eventSlug);
    try {
      const dataUrl = await generateCheckinGraphic(checkinLink, eventName);
      const link = document.createElement('a');
      link.download = `${eventSlug}-checkin-qr.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate check-in graphic:', err);
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
      <div className="flex min-h-[50vh] items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-muted)]">
        Redirecting to login…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto flex min-h-screen max-w-7xl items-start gap-6 px-4 py-6">
        <aside
          className={`sticky top-6 self-start rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3 transition-all ${
            isSidebarWide ? "w-[230px]" : "w-[80px]"
          }`}
          onMouseEnter={() => {
            if (!sidebarCondensed) return;
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = setTimeout(() => setSidebarExpanded(true), 80);
          }}
          onMouseLeave={() => {
            if (!sidebarCondensed) return;
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = setTimeout(() => setSidebarExpanded(false), 120);
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] ring-1 ring-[var(--color-border-subtle)]">
              <span className="text-lg font-semibold text-[var(--color-primary)]">B</span>
            </div>
            <button
              onClick={() => setSidebarCondensed((prev) => !prev)}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-xs text-[var(--color-text-muted)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
              aria-label={isSidebarWide ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarWide ? "⟨" : "⟩"}
            </button>
          </div>

          <nav className="mt-6 space-y-2">
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
          </nav>

          <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-3">
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-elevated)]"
            >
              <span>{isSidebarWide ? session.business.name : "Account"}</span>
              {isSidebarWide && <span>{profileOpen ? "–" : "+"}</span>}
            </button>
            {profileOpen && (
              <div className="space-y-2 rounded-xl bg-[var(--color-surface-elevated)] p-3 text-sm ring-1 ring-[var(--color-border-subtle)]">
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      "https://billing.stripe.com/p/login/aFa14odXR5gweH4gQRgA800",
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="w-full rounded-full px-3 py-2 text-left text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                >
                  Billing
                </button>
                <button className="w-full rounded-full px-3 py-2 text-left text-[var(--color-text)] hover:bg-[var(--color-surface)]">
                  Settings
                </button>
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

        <main className="flex-1 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-soft)]">
                BoothOS dashboard
              </p>
              <h1 className="text-2xl font-semibold text-[var(--color-text)]">
                {isPhotographer ? "Photographer workspace" : "Events & delivery"}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                {isPhotographer
                  ? "Manage photographer events, check-ins, and delivery flows."
                  : "Track self-serve events, uploads, and deliveries for your booth."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="rounded-full bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
              >
                Create event
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
            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Active events</h2>
                <div className="grid gap-3 lg:grid-cols-2">
                  {activeEvents.map((event) => {
                    const usage = usageFor(event);
                    const boothLink = linkFor(`/event/${event.slug}`, session.business.slug, event.slug);
                    const checkinLink = linkFor("/checkin", session.business.slug, event.slug);
                    const photographerLink = linkFor("/photographer", session.business.slug, event.slug);
                    const backgroundsLink = linkFor("/backgrounds", session.business.slug, event.slug);
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
                          {event.mode === "photographer" ? (
                            <div className="flex flex-col gap-2">
                              <LinkActions
                                label="Check-in"
                                url={checkinLink}
                                copyKey={`${event.slug}-checkin`}
                                onCopy={copyLink}
                                onQr={() => generateQr(checkinLink, `${event.name} check-in`)}
                                showQr
                                copied={copyStatus[`${event.slug}-checkin`] === true}
                              />
                          <LinkActions
                            label="Photographer"
                            url={photographerLink}
                            copyKey={`${event.slug}-photographer`}
                            onCopy={copyLink}
                            onQr={() => generateQr(photographerLink, `${event.name} photographer`)}
                            showQr
                            copied={copyStatus[`${event.slug}-photographer`] === true}
                          />
                          <LinkActions
                            label="Background manager"
                            url={backgroundsLink}
                            copyKey={`${event.slug}-backgrounds`}
                            onCopy={copyLink}
                            onQr={() => generateQr(backgroundsLink, `${event.name} backgrounds`)}
                            showQr
                            copied={copyStatus[`${event.slug}-backgrounds`] === true}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <LinkActions
                            label="Booth link"
                            url={boothLink}
                            copyKey={`${event.slug}-booth`}
                            onCopy={copyLink}
                            onQr={() => generateQr(boothLink, `${event.name} booth`)}
                            showQr
                            copied={copyStatus[`${event.slug}-booth`] === true}
                          />
                          <LinkActions
                            label="Background manager"
                            url={backgroundsLink}
                            copyKey={`${event.slug}-backgrounds`}
                            onCopy={copyLink}
                            onQr={() => generateQr(backgroundsLink, `${event.name} backgrounds`)}
                            showQr
                            copied={copyStatus[`${event.slug}-backgrounds`] === true}
                          />
                        </div>
                      )}
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="rounded-full bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-text)]"
                          >
                            Delete event
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
                          {event.mode === "photographer" && (
                            <>
                              <button
                                onClick={() => createSelectionLink(event.slug)}
                                className="rounded-full px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
                              >
                                Send selection link
                              </button>
                              <button
                                onClick={() => downloadCheckinGraphic(event.slug, event.name)}
                                className="rounded-full bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]/80"
                              >
                                Download QR graphic
                              </button>
                            </>
                          )}
                        </div>

                        {event.mode === "photographer" && (
                          <div className="space-y-3 text-xs text-[var(--color-text-muted)]">
                            <div className="rounded-xl bg-[var(--color-bg-subtle)] p-3 ring-1 ring-[var(--color-border-subtle)]">
                              <p className="text-[var(--color-text)] font-semibold">Collaborator Access</p>
                              <p className="mt-1 text-[var(--color-text-muted)]">
                                Collaborators can upload photos and send deliveries
                              </p>
                              <div className="mt-2 grid gap-2">
                                <label className="flex flex-col gap-1">
                                  Collaborator emails (comma separated)
                                  <input
                                    type="text"
                                    value={collaboratorInputs[event.slug] || ""}
                                    onChange={(e) =>
                                      setCollaboratorInputs((prev) => ({
                                        ...prev,
                                        [event.slug]: e.target.value,
                                      }))
                                    }
                                    className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                                    placeholder="photographer@example.com, assistant@example.com"
                                  />
                                </label>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => saveRoles(event.slug)}
                                    className="rounded-full bg-[var(--gradient-brand)] px-3 py-2 text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
                                  >
                                    {rolesStatus[event.slug] ?? "Save collaborators"}
                                  </button>
                                  {rolesStatus[event.slug] && (
                                    <span className="text-[var(--color-text-muted)]">
                                      {rolesStatus[event.slug]}
                                    </span>
                                  )}
                                </div>
                                {event.roles && event.roles.collaborator && event.roles.collaborator.length > 0 && (
                                  <div className="mt-2 rounded-lg bg-[var(--color-surface)] p-2">
                                    <p className="text-[var(--color-text)] font-semibold mb-1">Current collaborators:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {event.roles.collaborator.map((email) => (
                                        <span
                                          key={email}
                                          className="rounded-full bg-[var(--color-surface-elevated)] px-2 py-1 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                                        >
                                          {email}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

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
                        )}
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

              <BackgroundTester />
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
                          value={resendEmailMap[prod.id] || ""}
                          onChange={(e) =>
                            setResendEmailMap((prev) => ({ ...prev, [prod.id]: e.target.value }))
                          }
                          className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                        />
                        <button
                          onClick={() => resendDeliveryEmail(prod.id, productionEvent)}
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

      <CreateEventModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={createEvent}
        newEventName={newEventName}
        setNewEventName={setNewEventName}
        newPlan={newPlan}
        setNewPlan={setNewPlan}
        newMode={newMode}
        setNewMode={setNewMode}
        newAllowedSelections={newAllowedSelections}
        setNewAllowedSelections={setNewAllowedSelections}
        newEventDate={newEventDate}
        setNewEventDate={setNewEventDate}
        newEventTime={newEventTime}
        setNewEventTime={setNewEventTime}
        newAllowBgRemoval={newAllowBgRemoval}
        setNewAllowBgRemoval={setNewAllowBgRemoval}
        newAllowAiBg={newAllowAiBg}
        setNewAllowAiBg={setNewAllowAiBg}
        newAllowAiFilters={newAllowAiFilters}
        setNewAllowAiFilters={setNewAllowAiFilters}
        newDeliverySms={newDeliverySms}
        setNewDeliverySms={setNewDeliverySms}
        newGalleryPublic={newGalleryPublic}
        setNewGalleryPublic={setNewGalleryPublic}
        newOverlayTheme={newOverlayTheme}
        setNewOverlayTheme={setNewOverlayTheme}
        hasPhotographerSubscription={hasPhotographerSubscription}
      />

      <QrModal
        qrData={qrData}
        qrLink={qrLink}
        qrLabel={qrLabel}
        onClose={() => {
          setQrData(null);
          setQrLink(null);
          setQrLabel(null);
        }}
      />
    </div>
  );
}
