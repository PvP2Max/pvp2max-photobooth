"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Home, Calendar, Mail, Settings, LogOut, Plus, RotateCw, Trash2, Key, ExternalLink, Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { LinkActions } from "./console/LinkActions";
import { BackgroundTester } from "./console/BackgroundTester";
import { CreateEventModal } from "./console/CreateEventModal";
import { QrModal } from "./console/QrModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

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
  const [error, setError] = useState<string | null>(null);
  const [newEventName, setNewEventName] = useState("");
  const [newPlan, setNewPlan] = useState("free");
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
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [qrLabel, setQrLabel] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "events" | "deliveries">("overview");
  const [profileOpen, setProfileOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const navTabs = useMemo(
    () => [
      { id: "overview" as const, label: "Overview", icon: Home },
      { id: "events" as const, label: "Events", icon: Calendar },
      { id: "deliveries" as const, label: "Deliveries", icon: Mail },
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

  function isPaidPlan(plan: string): boolean {
    if (plan === "free") return false;
    if (plan === "photographer-event" && hasPhotographerSubscription) return false;
    return true;
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

    if (isPaidPlan(newPlan)) {
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            plan: newPlan,
            eventData: payload,
          }),
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          setError(data.error || "Could not start checkout.");
          toast.error("Checkout failed", { description: data.error });
          return;
        }
        window.location.href = data.url;
        return;
      } catch (err) {
        console.error(err);
        setError("Could not start checkout.");
        toast.error("Checkout failed");
        return;
      }
    }

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
        toast.error("Failed to create event", { description: data.error });
        return;
      }
      setSession((prev) =>
        prev ? { ...prev, events: [data.event as EventItem, ...prev.events] } : prev,
      );
      toast.success("Event created", { description: `${newEventName} is ready to go!` });
      setNewEventName("");
      setNewPlan("free");
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
      toast.error("Failed to create event");
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
        toast.error("Key rotation failed", { description: data.error });
        return;
      }
      setIssuingKey((prev) => ({ ...prev, [eventSlug]: data.key || "Updated" }));
      toast.success("Key rotated successfully");
    } catch (err) {
      console.error(err);
      setIssuingKey((prev) => ({ ...prev, [eventSlug]: "Failed" }));
      toast.error("Key rotation failed");
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
        toast.success(status === "closed" ? "Event closed" : "Event reopened");
      }
    } catch {
      toast.error("Failed to update event status");
    }
  }

  async function deleteEvent(eventId: string) {
    if (!window.confirm("Delete this event and all its files now? This cannot be undone.")) return;
    setError(null);
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
      toast.success("Event deleted", { description: "Event and storage removed." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete event.";
      setError(msg);
      toast.error("Delete failed", { description: msg });
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
        toast.error("Failed to save collaborators", { description: data.error });
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
      toast.success("Collaborators saved");
    } catch (err) {
      console.error(err);
      setRolesStatus((prev) => ({ ...prev, [eventSlug]: "Failed" }));
      toast.error("Failed to save collaborators");
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
      toast.error("Failed to load deliveries");
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
        toast.success("Email resent");
      } else {
        setSelectionStatus((prev) => ({ ...prev, [productionId]: "Failed" }));
        toast.error("Failed to resend email");
      }
    } catch {
      setSelectionStatus((prev) => ({ ...prev, [productionId]: "Failed" }));
      toast.error("Failed to resend email");
    }
  }

  async function createSelectionLink(eventSlug: string) {
    const email = selectionEmails[eventSlug];
    if (!email) {
      toast.error("Enter an email address first");
      return;
    }
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
        toast.error("Failed to create selection link", { description: data.error });
        return;
      }
      setSelectionLinks((prev) => ({ ...prev, [eventSlug]: data.url || "" }));
      setSelectionStatus((prev) => ({ ...prev, [eventSlug]: "Sent" }));
      toast.success("Selection link sent", { description: `Email sent to ${email}` });
    } catch {
      setSelectionStatus((prev) => ({ ...prev, [eventSlug]: "Failed" }));
      toast.error("Failed to create selection link");
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
        toast.error("Checkout failed", { description: data.error });
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutLoading(null);
      setError("Could not start checkout.");
      toast.error("Checkout failed");
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
        toast.success("Link copied!");
        window.setTimeout(() => setCopyStatus((prev) => ({ ...prev, [key]: false })), 1500);
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
  }

  async function generateCheckinGraphic(checkinUrl: string, eventName: string): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(1, '#0a1628');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.font = 'bold 72px system-ui';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Check-in Here', 540, 300);

    ctx.font = '48px system-ui';
    ctx.fillStyle = '#a3aac7';
    ctx.fillText(eventName, 540, 380);

    const qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 600, margin: 2 });
    const qrImg = new Image();
    await new Promise(r => { qrImg.onload = r; qrImg.src = qrDataUrl; });
    ctx.drawImage(qrImg, 240, 500, 600, 600);

    ctx.font = '36px system-ui';
    ctx.fillStyle = '#7b81a3';
    ctx.fillText('Scan to check in', 540, 1200);

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
      toast.success("QR graphic downloaded");
    } catch (err) {
      console.error('Failed to generate check-in graphic:', err);
      toast.error("Failed to generate QR graphic");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-start md:gap-6 md:py-6">
        {/* Mobile: Horizontal scrolling nav tabs */}
        <nav className="flex gap-2 overflow-x-auto pb-2 md:hidden">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={view === tab.id ? "default" : "secondary"}
                size="sm"
                onClick={() => setView(tab.id)}
                className="flex-shrink-0"
              >
                <Icon className="size-4" />
                {tab.label}
              </Button>
            );
          })}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex-shrink-0"
          >
            <Settings className="size-4" />
            Account
          </Button>
        </nav>

        {/* Mobile: Account dropdown */}
        {profileOpen && (
          <Card className="md:hidden">
            <CardContent className="p-3 space-y-2">
              <p className="px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
                {session.business.name}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() =>
                  window.open(
                    "https://billing.stripe.com/p/login/aFa14odXR5gweH4gQRgA800",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                Billing
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Settings
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={logout}
                className="w-full"
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Desktop: Vertical sidebar */}
        <aside
          className={cn(
            "sticky top-6 hidden self-start rounded-2xl border border-border bg-card p-3 transition-all md:block",
            isSidebarWide ? "w-[230px]" : "w-[80px]"
          )}
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
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
              <span className="text-lg font-semibold text-primary">B</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCondensed((prev) => !prev)}
              className="ml-auto size-8"
              aria-label={isSidebarWide ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarWide ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
          </div>

          <nav className="mt-6 space-y-2">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={view === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView(tab.id)}
                  className={cn("w-full", isSidebarWide ? "justify-start" : "justify-center")}
                >
                  <Icon className="size-4" />
                  {isSidebarWide && <span>{tab.label}</span>}
                </Button>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProfileOpen((prev) => !prev)}
              className={cn("w-full", isSidebarWide ? "justify-between" : "justify-center")}
            >
              <span>{isSidebarWide ? session.business.name : ""}</span>
              {isSidebarWide && (profileOpen ? <X className="size-4" /> : <Settings className="size-4" />)}
              {!isSidebarWide && <Settings className="size-4" />}
            </Button>
            {profileOpen && (
              <Card className="p-2">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() =>
                      window.open(
                        "https://billing.stripe.com/p/login/aFa14odXR5gweH4gQRgA800",
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    <ExternalLink className="size-4" />
                    Billing
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Settings className="size-4" />
                    Settings
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={logout}
                    className="w-full"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </aside>

        <main className="w-full flex-1 space-y-4 md:space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PageHeader
              title={isPhotographer ? "Photographer workspace" : "Events & delivery"}
              description={
                isPhotographer
                  ? "Manage photographer events, check-ins, and delivery flows."
                  : "Track self-serve events, uploads, and deliveries for your booth."
              }
            />
            <Button variant="gradient" onClick={() => setCreateModalOpen(true)}>
              <Plus className="size-4" />
              Create event
            </Button>
          </div>

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                {error}
                <Button variant="ghost" size="icon" onClick={() => setError(null)} className="size-6">
                  <X className="size-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {checkoutLoading && (
            <Alert>
              <LoadingSpinner size="sm" />
              <AlertDescription>Redirecting to checkout...</AlertDescription>
            </Alert>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{stats.liveEvents}</p>
                <p className="text-xs text-muted-foreground">Live events</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{stats.closedEvents}</p>
                <p className="text-xs text-muted-foreground">Closed events</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{stats.photoUsed}</p>
                <p className="text-xs text-muted-foreground">Photos used</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{stats.aiUsed}</p>
                <p className="text-xs text-muted-foreground">AI credits used</p>
              </CardContent>
            </Card>
          </div>

          {view === "overview" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active events</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeEvents.length === 0 ? (
                    <EmptyState
                      icon={<Calendar className="size-6" />}
                      title="No events yet"
                      description="Create your first event to get started."
                      action={
                        <Button variant="gradient" onClick={() => setCreateModalOpen(true)}>
                          <Plus className="size-4" />
                          Create event
                        </Button>
                      }
                    />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {activeEvents.map((event) => {
                        const usage = usageFor(event);
                        const boothLink = linkFor(`/event/${event.slug}`, session.business.slug, event.slug);
                        const checkinLink = linkFor("/checkin", session.business.slug, event.slug);
                        const photographerLink = linkFor("/photographer", session.business.slug, event.slug);
                        const backgroundsLink = linkFor("/backgrounds", session.business.slug, event.slug);
                        return (
                          <Card key={event.id} className="overflow-hidden">
                            <CardContent className="p-4 space-y-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold">{event.name}</p>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                    {event.slug}
                                  </p>
                                </div>
                                <Badge variant={event.status === "closed" ? "secondary" : "default"}>
                                  {event.status === "closed" ? "Closed" : "Live"}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Plan</p>
                                  <p className="font-semibold">{event.plan ?? "Event-based"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Mode</p>
                                  <p className="font-semibold">{event.mode ?? "self-serve"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Photos</p>
                                  <p className="font-semibold">
                                    {usage.photoCap === null ? "Unlimited" : `${usage.photoUsed ?? 0}/${usage.photoCap}`}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">AI credits</p>
                                  <p className="font-semibold">
                                    {usage.aiCredits === undefined ? "—" : `${usage.aiUsed}/${usage.aiCredits}`}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-2 text-xs">
                                {event.mode === "photographer" ? (
                                  <>
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
                                  </>
                                ) : (
                                  <>
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
                                  </>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => deleteEvent(event.id)}
                                >
                                  <Trash2 className="size-4" />
                                  Delete
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => rotateEventKey(event.slug)}
                                >
                                  <Key className="size-4" />
                                  {issuingKey[event.slug] ?? "Rotate key"}
                                </Button>
                                <Button
                                  variant="gradient"
                                  size="sm"
                                  onClick={() => createCheckout("event-basic", event.slug)}
                                >
                                  Buy event plan
                                </Button>
                                {event.mode === "photographer" && (
                                  <>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => createSelectionLink(event.slug)}
                                    >
                                      <Mail className="size-4" />
                                      Send selection
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => downloadCheckinGraphic(event.slug, event.name)}
                                    >
                                      <Download className="size-4" />
                                      Download QR
                                    </Button>
                                  </>
                                )}
                              </div>

                              {event.mode === "photographer" && (
                                <div className="space-y-3 pt-2 border-t border-border">
                                  <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Collaborator Access</Label>
                                    <p className="text-xs text-muted-foreground">
                                      Collaborators can upload photos and send deliveries
                                    </p>
                                    <Input
                                      type="text"
                                      value={collaboratorInputs[event.slug] || ""}
                                      onChange={(e) =>
                                        setCollaboratorInputs((prev) => ({
                                          ...prev,
                                          [event.slug]: e.target.value,
                                        }))
                                      }
                                      placeholder="photographer@example.com, assistant@example.com"
                                    />
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="gradient"
                                        size="sm"
                                        onClick={() => saveRoles(event.slug)}
                                      >
                                        {rolesStatus[event.slug] ?? "Save collaborators"}
                                      </Button>
                                    </div>
                                    {event.roles?.collaborator && event.roles.collaborator.length > 0 && (
                                      <div className="flex flex-wrap gap-1 pt-2">
                                        {event.roles.collaborator.map((email) => (
                                          <Badge key={email} variant="secondary">
                                            {email}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs">Selection email</Label>
                                    <Input
                                      type="email"
                                      value={selectionEmails[event.slug] || ""}
                                      onChange={(e) =>
                                        setSelectionEmails((prev) => ({ ...prev, [event.slug]: e.target.value }))
                                      }
                                    />
                                    {selectionLinks[event.slug] && (
                                      <div className="rounded-xl bg-secondary p-2 text-xs break-all">
                                        {selectionLinks[event.slug]}
                                      </div>
                                    )}
                                    {selectionStatus[event.slug] && (
                                      <p className="text-xs text-muted-foreground">{selectionStatus[event.slug]}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <BackgroundTester />
            </div>
          )}

          {view === "events" && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Events</CardTitle>
                  <Button variant="gradient" onClick={() => setCreateModalOpen(true)}>
                    <Plus className="size-4" />
                    Create event
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {session.events.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="size-6" />}
                    title="No events yet"
                    description="Create your first event to get started."
                  />
                ) : (
                  <div className="space-y-2">
                    {session.events.map((event) => (
                      <Card key={event.id}>
                        <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold">{event.name}</p>
                            <p className="text-sm text-muted-foreground">{event.slug}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => rotateEventKey(event.slug)}
                            >
                              <RotateCw className="size-4" />
                              {issuingKey[event.slug] ?? "Rotate key"}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => closeEvent(event.slug, event.status === "closed" ? "live" : "closed")}
                            >
                              {event.status === "closed" ? "Reopen" : "Close"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {view === "deliveries" && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Deliveries</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {session.events.map((event) => (
                      <Button
                        key={event.id}
                        variant={productionEvent === event.slug ? "default" : "secondary"}
                        size="sm"
                        onClick={() => fetchProductions(event.slug)}
                      >
                        {event.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingProductions && (
                  <div className="flex items-center gap-2 py-4">
                    <LoadingSpinner size="sm" />
                    <p className="text-sm text-muted-foreground">Loading deliveries...</p>
                  </div>
                )}

                {productionEvent && (
                  <div className="space-y-2">
                    {(productions[productionEvent] ?? []).length === 0 ? (
                      <EmptyState
                        icon={<Mail className="size-6" />}
                        title="No deliveries yet"
                        description="Deliveries will appear here when photos are sent."
                      />
                    ) : (
                      (productions[productionEvent] ?? []).map((prod) => (
                        <Card key={prod.id}>
                          <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-semibold">{prod.email}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(prod.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                type="email"
                                placeholder="Resend to email"
                                value={resendEmailMap[prod.id] || ""}
                                onChange={(e) =>
                                  setResendEmailMap((prev) => ({ ...prev, [prod.id]: e.target.value }))
                                }
                                className="w-48"
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => resendDeliveryEmail(prod.id, productionEvent)}
                              >
                                <Mail className="size-4" />
                                Resend
                              </Button>
                              {selectionStatus[prod.id] && (
                                <Badge variant="secondary">{selectionStatus[prod.id]}</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
