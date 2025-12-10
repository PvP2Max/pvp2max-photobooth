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

export default function BusinessPage() {
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
    const photographer = events.filter((e) => e.mode === "photographer");
    const isPhotographerActive =
      (session?.business.subscriptionStatus ?? "") === "active" ||
      (session?.business.subscriptionPlan ?? "").toLowerCase().includes("photographer");
    return {
      total: events.length,
      live: live.length,
      photographer: photographer.length,
      subscription: session?.business.subscriptionStatus ?? "none",
      isPhotographerActive,
    };
  }, [session]);

  useEffect(() => {
    const last = window.localStorage.getItem("boothos-last-business") ?? "";
    setLoginEmail(last);
    void loadSession();
    const params = new URLSearchParams(window.location.search);
    const qView = params.get("view");
    if (qView === "events" || qView === "deliveries" || qView === "overview" || qView === "staff") {
      setView(qView);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const needsCondensed = window.innerWidth < 1280;
      setSidebarCondensed(needsCondensed);
      if (!needsCondensed) setSidebarExpanded(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      testStream?.getTracks().forEach((t) => t.stop());
    };
  }, [testStream]);

  function eventNeedsPayment(event: EventItem) {
    if (event.mode === "photographer") {
      const plan = event.plan ?? "";
      if (plan === "photographer-single") {
        return event.paymentStatus !== "paid";
      }
      if (plan === "photographer-monthly") {
        if (session?.business.subscriptionStatus === "active") return false;
        return event.paymentStatus !== "paid";
      }
      return true;
    }
    return false;
  }

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

  function signOut() {
    fetch("/api/auth/business", { method: "DELETE", credentials: "include" }).catch(() => {});
    fetch("/api/auth/event", { method: "DELETE", credentials: "include" }).catch(() => {});
    window.location.href = "/";
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

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session) return;
    if (!newEventDate) {
      setError("Event date is required. Events auto-delete 7 days after this date.");
      return;
    }
    setError(null);
    setMessage(null);
    try {
          const res = await fetch("/api/business/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: newEventName,
              accessCode: newMode === "photographer" ? newEventKey || undefined : undefined,
              plan: newPlan,
              mode: newMode,
              allowBackgroundRemoval: newAllowBgRemoval,
              allowAiBackgrounds: newAllowAiBg,
              allowAiFilters: newAllowAiFilters,
          deliveryEmail: true,
          deliverySms: newDeliverySms,
          overlayTheme: newOverlayTheme,
          galleryPublic: newGalleryPublic,
          eventDate: newEventDate,
          eventTime: newEventTime || undefined,
          allowedSelections: newMode === "photographer" ? newAllowedSelections : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        event?: EventItem;
        accessCode?: string;
        checkoutUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not create event.");
        return;
      }
      if (data.checkoutUrl) {
        setMessage("Redirecting to checkout to finish creating your event…");
        window.location.href = data.checkoutUrl;
        return;
      }
      if (!data.event) {
        setError(data.error || "Could not create event.");
        return;
      }
      setSession({
        ...session,
        events: [data.event, ...session.events],
      });
      setMessage(`Created event "${data.event.name}". Save this key: ${data.accessCode}`);
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

  async function deleteEvent(event: EventItem) {
    if (!session) return;
    const confirmDelete = window.confirm(
      `Delete event "${event.name}"? All photos, backgrounds, and data for this event will be removed.`,
    );
    if (!confirmDelete) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/business/events/${event.id}/delete`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; status?: string };
      if (!res.ok) {
        setError(data.error || "Failed to delete event.");
        return;
      }
      setSession((prev) =>
        prev
          ? {
              ...prev,
              events: prev.events.filter((ev) => ev.id !== event.id),
            }
          : prev,
      );
      setMessage(`Deleted event "${event.name}".`);
    } catch {
      setError("Failed to delete event.");
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

  function absoluteLink(href: string) {
    if (href.startsWith("http")) return href;
    if (typeof window === "undefined") return href;
    return `${window.location.origin}${href}`;
  }

  function copy(text: string, label?: string, key?: string) {
    const absolute = absoluteLink(text);
    navigator.clipboard?.writeText(absolute).catch(() => {});
    if (key) {
      setCopiedLink((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedLink((prev) => ({ ...prev, [key]: false }));
      }, 5000);
    } else {
      setMessage(`Copied ${label ?? "link"} to clipboard.`);
    }
  }

  async function startTestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setTestStream(stream);
      setTestError(null);
      setTestMessage("Camera ready. Capture a test shot.");
      const videoEl = testVideoRef.current;
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play();
        setTestVideoReady(true);
      }
    } catch {
      setTestError("Camera unavailable. Check permissions.");
    }
  }

  function stopTestCamera() {
    testStream?.getTracks().forEach((t) => t.stop());
    setTestStream(null);
    setTestVideoReady(false);
  }

  function captureTestFrame() {
    if (!testVideoRef.current || !testCanvasRef.current) return;
    const video = testVideoRef.current;
    const canvas = testCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const url = canvas.toDataURL("image/png");
    setTestCapture(url);
    setTestResult(null);
    setTestMessage("Captured. Process to preview on a default background.");
  }

  async function processTestFile(file: File) {
    setTestLoading(true);
    setTestError(null);
    setTestShowTips(false);
    setTestMessage("Removing background…");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/remove-background", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { imageBase64?: string; contentType?: string; error?: string };
      if (!res.ok || !data.imageBase64) {
        throw new Error(data.error || "Background removal failed.");
      }
      const contentType = data.contentType || "image/png";
      const cutout = `data:${contentType};base64,${data.imageBase64}`;
      setTestResult(cutout);
      setTestMessage("Preview ready. Does this look right?");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to process test image.";
      setTestError(msg);
      setTestMessage(null);
    } finally {
      setTestLoading(false);
    }
  }

  async function processTestCapture() {
    if (!testCapture) {
      setTestError("Capture or upload a photo first.");
      return;
    }
    const blob = await fetch(testCapture).then((r) => r.blob());
    const file = new File([blob], "test-capture.png", { type: "image/png" });
    await processTestFile(file);
  }

  async function handleTestUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestCapture(URL.createObjectURL(file));
    await processTestFile(file);
  }

  async function showQr(href: string, label: string) {
    try {
      const absolute = absoluteLink(href);
      const data = await QRCode.toDataURL(absolute, { margin: 1, scale: 6 });
      setQrData(data);
      setQrLink(absolute);
      setQrLabel(label);
    } catch {
      setError("Could not generate QR code.");
    }
  }

  async function startCheckout(plan: string, eventId?: string) {
    if (!session) return;
    setError(null);
    setMessage(null);
    setCheckoutLoading(plan + (eventId ?? ""));
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          plan,
          eventId,
          successUrl: window.location.origin + "/business",
          cancelUrl: window.location.href,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; message?: string };
      if (!res.ok || !data.url) {
        setError(data.error || data.message || "Unable to start checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Failed to start checkout.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function sendSelectionLink(event: EventItem) {
    if (!session) return;
    const email = selectionEmails[event.id];
    if (!email) {
      setError("Enter a guest email first.");
      return;
    }
    setError(null);
    setMessage(null);
    setSelectionStatus((prev) => ({ ...prev, [event.id]: "Sending..." }));
    try {
      const res = await fetch(
        `/api/selections/start?business=${session.business.slug}&event=${event.slug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, sendEmail: true }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { shareUrl?: string; error?: string; emailed?: boolean };
      if (!res.ok || !data.shareUrl) {
        setError(data.error || "Failed to create selection link.");
        setSelectionStatus((prev) => ({ ...prev, [event.id]: "Failed" }));
        return;
      }
      setSelectionLinks((prev) => ({ ...prev, [event.id]: data.shareUrl! }));
      setSelectionStatus((prev) => ({
        ...prev,
        [event.id]: data.emailed === false ? "Link created (not emailed)" : "Link emailed",
      }));
      setMessage("Selection link ready.");
    } catch {
      setError("Failed to create selection link.");
      setSelectionStatus((prev) => ({ ...prev, [event.id]: "Failed" }));
    }
  }

  async function openBackgroundManager(event: EventItem) {
    if (!session) return;
    const ownsEvent = session.events.some((ev) => ev.id === event.id);
    if (!ownsEvent) {
      setError("You do not have access to this event.");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/auth/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ businessSlug: session.business.slug, eventSlug: event.slug }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Unable to open backgrounds for this event.");
        return;
      }
    } catch {
      setError("Unable to open backgrounds for this event.");
      return;
    }
    router.push(`/backgrounds?business=${session.business.slug}&event=${event.slug}`);
  }

  const renderNavButtons = (options?: { condensed?: boolean; onSelect?: () => void }) =>
    navTabs.map((tab) => {
      const active = view === tab.id;
      const activeClasses = active
        ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] ring-[var(--color-primary)]"
        : "bg-[var(--color-surface-elevated)] text-[var(--color-text)] ring-[var(--color-border-subtle)]";
      const sizing = options?.condensed
        ? "flex h-10 w-10 items-center justify-center text-[11px]"
        : "w-full px-3 py-2 text-left text-xs";
      return (
        <button
          key={tab.id}
          onClick={() => {
            setView(tab.id);
            options?.onSelect?.();
          }}
          className={`rounded-xl ring-1 transition ${sizing} ${activeClasses}`}
          aria-label={options?.condensed ? `Go to ${tab.label}` : undefined}
          title={options?.condensed ? tab.label : undefined}
        >
          {options?.condensed ? navIcons[tab.id] : tab.label}
        </button>
      );
    });

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
    <main className="mx-auto w-full max-w-6xl px-0 py-10 lg:flex lg:h-[calc(100vh-80px)] lg:max-w-7xl lg:gap-6 lg:overflow-hidden">
      <aside
        className={`sticky top-20 hidden h-[calc(100vh-160px)] flex-shrink-0 rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)] transition-[width] duration-300 ease-in-out lg:flex ${
          isSidebarWide ? "w-64 p-4" : "w-16 p-2"
        }`}
      >
        <div className={`flex h-full flex-col ${isSidebarWide ? "overflow-y-auto" : "items-center gap-3"}`}>
          {!isSidebarWide ? (
            <>
              <button
                onClick={() => setSidebarExpanded(true)}
                aria-label="Expand navigation"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] ring-1 ring-[var(--color-border-subtle)] transition hover:ring-[var(--color-primary)]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[var(--color-text)]"
                >
                  <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <div className="flex flex-col items-center gap-2">{renderNavButtons({ condensed: true })}</div>
              <div className="mt-auto flex flex-col items-center gap-2 pb-1">
                <button
                  onClick={() => setSidebarExpanded(true)}
                  title={session.business.name}
                  aria-label="Open account"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-text-on-primary)] ring-1 ring-[var(--color-primary)]"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[var(--color-text-on-primary)]"
                  >
                    <path
                      d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.64-6 3.66V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.34C18 15.64 15.33 14 12 14Z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Dashboard</p>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{session.business.name}</p>
                </div>
                {sidebarCondensed && (
                  <button
                    onClick={() => setSidebarExpanded(false)}
                    aria-label="Collapse navigation"
                    className="h-9 w-9 rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-2 text-xs">{renderNavButtons()}</div>
              <div className="mt-auto border-t border-[var(--color-border-subtle)] pt-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Account</p>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="mt-2 flex w-full items-center justify-between rounded-xl bg-[var(--color-surface-elevated)] px-3 py-2 text-left text-sm text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                >
                  <span className="truncate">{session.business.name || session.user?.email || "Account"}</span>
                  <span>{profileOpen ? "–" : "+"}</span>
                </button>
                {profileOpen && (
                  <div className="mt-2 space-y-2 rounded-xl bg-[var(--color-surface-elevated)] p-3 ring-1 ring-[var(--color-border-subtle)]">
                    <p className="text-xs font-semibold text-[var(--color-text)]">{session.business.name}</p>
                    <p className="text-[11px] text-[var(--color-text-soft)]">{session.user?.email}</p>
                    <div className="grid gap-2 text-xs">
                      <a
                        href="/settings/billing"
                        className="rounded-lg bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] hover:ring-[var(--color-accent)]"
                      >
                        Billing (manage subscription)
                      </a>
                      <a
                        href="/settings"
                        className="rounded-lg bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] hover:ring-[var(--color-accent)]"
                      >
                        Settings (profile & password)
                      </a>
                      <button
                        onClick={signOut}
                        className="rounded-lg bg-[var(--color-danger)]/90 px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-6 lg:h-full lg:overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">BoothOS Dashboard</p>
            <h1 className="text-3xl font-semibold text-[var(--color-text)]">
              {session.business.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`rounded-full px-3 py-2 ring-1 text-xs ${
                  view === tab.id
                    ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] ring-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text)] ring-[var(--color-border-subtle)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

      {view === "overview" && (
        <>
          <section className="mt-4 grid gap-3 rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)] md:grid-cols-4">
            <div className="rounded-xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-soft)]">Events</p>
              <p className="text-2xl font-semibold text-[var(--color-text)]">{stats.total}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Total</p>
            </div>
            <div className="rounded-xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-soft)]">Live</p>
              <p className="text-2xl font-semibold text-[var(--color-text)]">{stats.live}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Open events</p>
            </div>
            <div className="rounded-xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-soft)]">Photographer</p>
              <p className="text-2xl font-semibold text-[var(--color-text)]">{stats.photographer}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Pro-mode events</p>
            </div>
            <div className="rounded-xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-soft)]">Subscription</p>
              <p className="text-lg font-semibold text-[var(--color-text)] capitalize">{stats.subscription}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Photographer monthly</p>
            </div>
          </section>
        </>
      )}

      {/* mobile tab bar */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs lg:hidden">
        {mobileTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`rounded-full px-3 py-2 ring-1 ${
              view === tab.id
                ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] ring-[var(--color-primary)]"
                : "bg-[var(--color-surface)] text-[var(--color-text)] ring-[var(--color-border-subtle)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
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

      {createModalOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-[var(--color-overlay)]/80 p-4 backdrop-blur-sm">
          <div className="relative mt-10 w-full max-w-4xl rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Create event</p>
                <h3 className="text-xl font-semibold text-[var(--color-text)]">Spin up a new event</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Events auto-delete (including storage) 7 days after the event date.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                aria-label="Close create event modal"
                className="rounded-xl bg-[var(--color-surface-elevated)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] hover:ring-[var(--color-accent)]"
              >
                Close
              </button>
            </div>
            <form onSubmit={createEvent} className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                required
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="Event name (e.g., Winter Gala)"
                className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
              />
              {newMode === "photographer" && (
                <input
                  value={newEventKey}
                  onChange={(e) => setNewEventKey(e.target.value)}
                  placeholder="Event access key (optional)"
                  className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              )}
              <select
                value={newMode}
                onChange={(e) => setNewMode(e.target.value as "self-serve" | "photographer")}
                className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
              >
                <option value="self-serve">Self-service booth (logged-in staff auto-unlocked)</option>
                <option value="photographer">Photographer mode (staff passkey optional)</option>
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
              <label className="text-sm text-[var(--color-text-muted)]">
                Event date (required)
                <input
                  required
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
              <label className="text-sm text-[var(--color-text-muted)]">
                Event time (optional)
                <input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
              {newMode === "photographer" && (
                <label className="text-sm text-[var(--color-text-muted)]">
                  Selections per guest (photographer mode)
                  <input
                    type="number"
                    min={1}
                    value={newAllowedSelections}
                    onChange={(e) => setNewAllowedSelections(Number(e.target.value) || 1)}
                    placeholder="Selections per guest"
                    className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
                  />
                </label>
              )}
              <div className="md:col-span-3 flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newAllowBgRemoval}
                    onChange={(e) => setNewAllowBgRemoval(e.target.checked)}
                  />
                  Allow background removal (cutouts)
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
                  Filters
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
              <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-[var(--color-text-soft)]">
                  Events and storage purge 7 days after the event date to conserve space.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-xl bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)]"
                  >
                    Create event
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {view === "overview" && (
      <section className="mt-6 grid gap-3 rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Billing</p>
            <h2 className="text-xl font-semibold text-[var(--color-text)]">Photographer subscription</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              $250/mo subscription unlocks all photographer events. You can still pay $100 per event if you prefer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 ring-1 ring-[var(--color-border-subtle)]">
              Status: {session.business.subscriptionStatus ?? "none"}
            </span>
            {session.business.subscriptionPlan && (
              <span className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 ring-1 ring-[var(--color-border-subtle)]">
                Plan: {session.business.subscriptionPlan}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            onClick={() => startCheckout("photographer-monthly")}
            disabled={checkoutLoading === "photographer-monthly"}
            className="rounded-xl bg-[var(--gradient-brand)] px-4 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)] disabled:opacity-60"
          >
            {checkoutLoading === "photographer-monthly" ? "Loading..." : "Start $250/mo subscription"}
          </button>
          <button
            onClick={() => startCheckout("photographer-single")}
            disabled={checkoutLoading === "photographer-single"}
            className="rounded-xl bg-[var(--color-surface-elevated)] px-4 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] disabled:opacity-60"
          >
            {checkoutLoading === "photographer-single" ? "Loading..." : "Pay $100 single event"}
          </button>
        </div>
      </section>
      )}

      {view === "overview" && (
        <section className="mt-6 grid gap-4 rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
          <p className="text-sm text-[var(--color-text-muted)]">
            Quick actions for creating events and managing billing.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setView("events");
                setCreateModalOpen(true);
              }}
              className="rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(155,92,255,0.32)] hover:opacity-95"
            >
              Create a new event
            </button>
            <button
              onClick={() => setView("deliveries")}
              className="rounded-xl bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-white ring-1 ring-[var(--color-border-strong)] shadow-[0_10px_25px_rgba(0,0,0,0.25)] hover:ring-[var(--color-primary)]"
            >
              View deliveries
            </button>
          </div>
        </section>
      )}

      {view === "overview" && (
        <section className="mt-6 grid gap-4 rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">AI test bench</p>
              <h2 className="text-xl font-semibold text-[var(--color-text)]">Test background removal</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Capture (or upload for photographer subscription) to remove the background and preview on a default backdrop.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-text-soft)]">
              <span className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 ring-1 ring-[var(--color-border-subtle)]">
                Deletes after preview (not stored)
              </span>
              {!stats.isPhotographerActive && (
                <span className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 ring-1 ring-[var(--color-border-subtle)]">
                  Uploads unlock with photographer subscription
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3 rounded-2xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
              <div className="rounded-xl bg-[var(--color-bg-subtle)] p-3 ring-1 ring-[var(--color-border-subtle)]">
                <video
                  ref={testVideoRef}
                  className={`h-64 w-full rounded-lg bg-[var(--color-bg)] object-cover ${testVideoReady ? "" : "opacity-70"}`}
                  muted
                  playsInline
                />
                <canvas ref={testCanvasRef} className="hidden" />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={startTestCamera}
                    className="rounded-full bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] hover:ring-[var(--color-accent)]"
                  >
                    {testStream ? "Restart camera" : "Start camera"}
                  </button>
                  <button
                    type="button"
                    onClick={captureTestFrame}
                    disabled={!testStream}
                    className="rounded-full bg-[var(--gradient-brand)] px-3 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_10px_25px_rgba(155,92,255,0.3)] disabled:opacity-60"
                  >
                    Capture test shot
                  </button>
                  <button
                    type="button"
                    onClick={stopTestCamera}
                    disabled={!testStream}
                    className="rounded-full bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] disabled:opacity-60"
                  >
                    Stop camera
                  </button>
                  {stats.isPhotographerActive && (
                    <label className="flex cursor-pointer items-center gap-2 rounded-full bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] hover:ring-[var(--color-accent)]">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleTestUpload}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={processTestCapture}
                    disabled={!testCapture || testLoading}
                    className="rounded-full bg-[var(--color-accent)] px-3 py-2 font-semibold text-[var(--color-text-on-dark)] ring-1 ring-[var(--color-accent-soft)] shadow-[0_8px_22px_rgba(56,189,248,0.28)] disabled:opacity-60"
                  >
                    {testLoading ? "Processing…" : "Process + preview"}
                  </button>
                </div>
              </div>
              {testCapture && (
                <div className="text-xs text-[var(--color-text-muted)]">
                  Captured preview ready. You can re-capture or process with the current image.
                </div>
              )}
              {testError && (
                <div className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]">
                  {testError}
                </div>
              )}
              {testMessage && (
                <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]">
                  {testMessage}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-2xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
              <p className="text-sm font-semibold text-[var(--color-text)]">Preview</p>
              <div className="rounded-xl bg-[var(--color-bg-subtle)] p-3 ring-1 ring-[var(--color-border-subtle)]">
                <div
                  className="relative aspect-video overflow-hidden rounded-lg ring-1 ring-[var(--color-border-subtle)]"
                  style={{
                    backgroundImage: `url(${defaultBgPreview})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {testResult ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={testResult}
                      alt="Processed preview"
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                      Capture and process to preview here.
                    </div>
                  )}
                </div>
              </div>
              {testResult && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setTestShowTips(false);
                      setTestMessage("Great! Background removal looks good.");
                    }}
                    className="rounded-full bg-[var(--color-success-soft)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]"
                  >
                    Looks right
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestShowTips(true)}
                    className="rounded-full bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] hover:ring-[var(--color-accent)]"
                  >
                    Not quite
                  </button>
                </div>
              )}
              {testShowTips && (
                <div className="rounded-xl bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]">
                  <p className="font-semibold">Tips for cleaner cutouts:</p>
                  <ul className="mt-2 list-disc pl-5 text-[var(--color-text-muted)]">
                    <li>Use soft, angled lighting (40–80% power) aimed slightly downward.</li>
                    <li>Stand 1–2 feet away from a flat, solid-colored wall to reduce spill.</li>
                    <li>Avoid motion blur—steady the device and use adequate light.</li>
                    <li>Keep the subject fully in frame and avoid heavy shadows behind them.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {view === "events" && (
        <section className="mt-6 grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Events</h2>
            <div className="flex flex-col items-end gap-2 text-right">
              <p className="text-xs text-[var(--color-text-muted)]">
                Events auto-delete (with storage) 7 days after the event date.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="rounded-xl bg-[var(--gradient-brand)] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(155,92,255,0.32)] hover:opacity-95"
                >
                  New event
                </button>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Copy links and share with staff. Logged-in users skip event keys.
                </p>
              </div>
            </div>
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
                          {overlayLabel(event.overlayTheme)}
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
                      {event.mode === "photographer" && event.paymentStatus !== "paid" && (
                        <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-text-muted)]">
                          <span className="rounded-full bg-[rgba(249,115,115,0.12)] px-3 py-1 ring-1 ring-[rgba(249,115,115,0.35)] text-[var(--color-text)]">
                            Payment required to unlock photographer mode.
                          </span>
                          <button
                            onClick={() => startCheckout("photographer-single", event.id)}
                            disabled={checkoutLoading === "photographer-single" + event.id}
                            className="rounded-full bg-[var(--color-accent)] px-3 py-1 font-semibold text-[var(--color-text-on-dark)] ring-1 ring-[var(--color-accent-soft)] shadow-[0_8px_22px_rgba(56,189,248,0.28)]"
                          >
                            {checkoutLoading === "photographer-single" + event.id
                              ? "Loading..."
                              : "Pay $100 event"}
                          </button>
                          <button
                            onClick={() => startCheckout("photographer-monthly")}
                            disabled={checkoutLoading === "photographer-monthly"}
                            className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                          >
                            {checkoutLoading === "photographer-monthly" ? "Loading..." : "Start $250/mo"}
                          </button>
                        </div>
                      )}
                      {event.plan === "free" && (
                        <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-text-muted)]">
                          <span className="rounded-full bg-[rgba(103,232,249,0.12)] px-3 py-1 ring-1 ring-[rgba(103,232,249,0.35)] text-[var(--color-text)]">
                            Free tier: watermark + 50 photo cap.
                          </span>
                          <button
                            onClick={() => startCheckout("event-basic", event.id)}
                            disabled={checkoutLoading === "event-basic" + event.id}
                            className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                          >
                            Upgrade to Basic
                          </button>
                          <button
                            onClick={() => startCheckout("event-unlimited", event.id)}
                            disabled={checkoutLoading === "event-unlimited" + event.id}
                            className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                          >
                            Unlimited
                          </button>
                          <button
                            onClick={() => startCheckout("event-ai", event.id)}
                            disabled={checkoutLoading === "event-ai" + event.id}
                            className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                          >
                            AI backgrounds
                          </button>
                        </div>
                      )}
                      {event.allowAiBackgrounds && (
                        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-[var(--color-surface-elevated)] px-3 py-3 md:px-4 ring-1 ring-[var(--color-border-subtle)]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold text-[var(--color-text)]">
                              AI backgrounds for this event
                            </p>
                            {eventNeedsPayment(event) && (
                              <span className="rounded-full bg-[rgba(249,115,115,0.12)] px-3 py-1 text-[10px] font-semibold text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]">
                                Pay first to enable
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--color-text-soft)]">
                            Generate AI backgrounds and upload frames inside the Backgrounds manager. Frames are upload-only on the AI plan.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => openBackgroundManager(event)}
                              className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2 text-[11px] font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-strong)] transition hover:ring-[var(--color-accent)]"
                            >
                              Open backgrounds manager
                            </button>
                          </div>
                        </div>
                      )}
                      {(((event.mode ?? "self-serve") === "self-serve")
                        ? [{ label: "Booth link", href: booth }]
                        : [
                            { label: "Check-in link", href: checkin },
                            { label: "Photographer link", href: photographer },
                            { label: "Front desk link", href: frontdesk },
                            { label: "Booth link", href: booth },
                          ]
                      ).map((link) => (
                        <div
                          key={link.label}
                          className="flex w-full min-w-0 max-w-full flex-col gap-2 rounded-xl bg-[var(--color-surface-elevated)] px-3 py-2 text-left ring-1 ring-[var(--color-border-subtle)] sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0 w-full sm:max-w-[420px]">
                            <p className="text-[11px] text-[var(--color-text-muted)]">{link.label}</p>
                            <p className="break-words font-mono text-[11px] text-[var(--color-text)] sm:truncate">
                              {absoluteLink(link.href)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-1 self-start">
                            <button
                              onClick={() => copy(link.href, link.label, `${event.id}-${link.label}`)}
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold ring-1 transition ${
                                copiedLink[`${event.id}-${link.label}`]
                                  ? "bg-[rgba(34,197,94,0.2)] text-[var(--color-text)] ring-[rgba(34,197,94,0.5)]"
                                  : "bg-[var(--color-surface)] text-[var(--color-text)] ring-[var(--color-border-subtle)]"
                              }`}
                            >
                              {copiedLink[`${event.id}-${link.label}`] ? "Copied" : "Copy"}
                            </button>
                            <button
                              onClick={() => showQr(link.href, link.label)}
                              className="rounded-full bg-[var(--color-surface)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                            >
                              QR
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:flex-nowrap">
                      <button
                        onClick={() => rotateKey(event.id)}
                        className="whitespace-nowrap rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-strong)] transition hover:ring-[var(--color-accent)]"
                      >
                        Rotate access key
                      </button>
                      {event.status === "closed" ? (
                        <button
                          onClick={() => updateStatus(event.id, "live")}
                          className="whitespace-nowrap rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                        >
                          Reopen
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(event.id, "closed")}
                          className="whitespace-nowrap rounded-full bg-[var(--color-surface-elevated)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                        >
                          Close event
                        </button>
                      )}
                      <button
                        onClick={() => loadProductions(event.slug)}
                        className="whitespace-nowrap rounded-full bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
                      >
                        View deliveries
                      </button>
                      <button
                        onClick={() => deleteEvent(event)}
                        className="whitespace-nowrap rounded-full bg-[var(--color-danger)]/90 px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]"
                      >
                        Delete event
                      </button>
                      {event.mode === "photographer" && (
                        <div className="w-full rounded-xl bg-[var(--color-surface-elevated)] px-3 py-3 ring-1 ring-[var(--color-border-subtle)]">
                          <p className="text-[11px] font-semibold text-[var(--color-text)]">
                            Send selection link
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <input
                              type="email"
                              placeholder="guest@example.com"
                              value={selectionEmails[event.id] ?? ""}
                              onChange={(e) =>
                                setSelectionEmails((prev) => ({ ...prev, [event.id]: e.target.value }))
                              }
                              className="min-w-[220px] flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--input-placeholder)]"
                            />
                            <button
                              onClick={() => sendSelectionLink(event)}
                              className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-[var(--color-text-on-dark)] ring-1 ring-[var(--color-accent-soft)] shadow-[0_8px_22px_rgba(56,189,248,0.28)]"
                            >
                              Send link
                            </button>
                          </div>
                          {selectionStatus[event.id] && (
                            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                              {selectionStatus[event.id]}{" "}
                              {selectionLinks[event.id] && (
                                <button
                                  onClick={() => copy(selectionLinks[event.id])}
                                  className="ml-2 text-[11px] font-semibold text-[var(--color-primary)] underline"
                                >
                                  Copy link
                                </button>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {view === "deliveries" && (
      <section className="mt-8 rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Deliveries</p>
            <h2 className="text-xl font-semibold text-[var(--color-text)]">Resend & manage</h2>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Archive downloads are available on paid plans; free tier uses individual links with watermarks.
          </p>
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
                      className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-[var(--color-text-on-dark)] ring-1 ring-[var(--color-accent-soft)] shadow-[0_8px_22px_rgba(56,189,248,0.28)]"
                    >
                      Resend
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                  {item.attachments.length} file(s) •{" "}
                  {item.downloadToken ? "Tokenized download ready" : "No download token"} • Downloads:{" "}
                  {item.downloadCount ?? 0}
                  {item.lastDownloadedAt
                    ? ` (last ${new Date(item.lastDownloadedAt).toLocaleString()})`
                    : ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Select an event to view deliveries.</p>
        )}
      </section>
      )}

      {qrData && qrLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)] px-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">{qrLabel ?? "QR code"}</p>
                <p className="text-sm text-[var(--color-text-muted)] break-all">{qrLink}</p>
              </div>
              <button
                onClick={() => {
                  setQrData(null);
                  setQrLink(null);
                  setQrLabel(null);
                }}
                className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
              >
                Close
              </button>
            </div>
            <div className="mt-4 flex justify-center">
              <img
                src={qrData}
                alt="QR code"
                className="h-56 w-56 rounded-xl bg-white p-2 ring-1 ring-[var(--color-border-subtle)]"
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
