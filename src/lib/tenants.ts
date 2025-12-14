import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase";
import { verifyBearer, roleForEvent, type AuthenticatedUser } from "./auth";
import { getFirestore } from "firebase-admin/firestore";

export type BoothEventPlan =
  | "free"
  | "event-basic"
  | "event-unlimited"
  | "event-ai"
  | "photographer-single"
  | "photographer-monthly";

export type BoothEvent = {
  id: string;
  name: string;
  slug: string;
  mode: "self-serve" | "photographer";
  status: "draft" | "live" | "closed";
  ownerUid: string;
  roles?: {
    photographer?: string[];
    review?: string[];
  };
  accessHint?: string;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  plan?: BoothEventPlan;
  photoCap?: number | null;
  photoUsed?: number;
  aiCredits?: number;
  aiUsed?: number;
  overlayPack?: string;
  overlaysAll?: boolean;
  premiumFilters?: boolean;
  watermarkEnabled?: boolean;
  brandingRemoval?: boolean;
  smsEnabled?: boolean;
  galleryZipEnabled?: boolean;
  customUrl?: string;
  analyticsEnabled?: boolean;
  allowBackgroundRemoval?: boolean;
  allowAiBackgrounds?: boolean;
  allowAiFilters?: boolean;
  deliveryEmail?: boolean;
  deliverySms?: boolean;
  overlayTheme?: string;
  overlayLogo?: string;
  galleryPublic?: boolean;
  eventDate?: string;
  eventTime?: string;
  allowedSelections?: number;
  paymentStatus?: "unpaid" | "pending" | "paid";
  allowedBackgroundIds?: string[];
  allowedFrameIds?: string[];
};

export type BoothBusiness = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  events: BoothEvent[];
  subscriptionId?: string;
  subscriptionStatus?: "active" | "past_due" | "canceled" | "incomplete" | "trialing";
  subscriptionPlan?: BoothEventPlan;
  ownerUid?: string;
};

export type TenantScope = {
  businessId: string;
  businessSlug: string;
  businessName: string;
  eventId: string;
  eventSlug: string;
  eventName: string;
};

export type EventContext = {
  business: BoothBusiness;
  event: BoothEvent;
  scope: TenantScope;
  roles: {
    owner: boolean;
    photographer: boolean;
    review: boolean;
  };
};

type TenantIndex = {
  businesses: BoothBusiness[];
};

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const TENANT_FILE = path.join(STORAGE_ROOT, "tenants.json");
const ADMIN_TOKEN = process.env.BOOTHOS_ADMIN_TOKEN ?? "ArcticAuraDesigns";
const FIRESTORE_USERS = "users";

function planDefaults(plan: BoothEventPlan | undefined) {
  switch (plan) {
    case "event-basic":
      return {
        photoCap: 100,
        aiCredits: 0,
        overlaysAll: true,
        premiumFilters: true,
        watermarkEnabled: false,
        smsEnabled: true,
        allowAiBackgrounds: false,
        galleryZipEnabled: true,
      };
    case "event-unlimited":
      return {
        photoCap: null,
        aiCredits: 0,
        overlaysAll: true,
        premiumFilters: true,
        watermarkEnabled: false,
        smsEnabled: true,
        allowAiBackgrounds: false,
        galleryZipEnabled: true,
      };
    case "event-ai":
      return {
        photoCap: null,
        aiCredits: 10,
        overlaysAll: true,
        premiumFilters: true,
        watermarkEnabled: false,
        smsEnabled: true,
        allowAiBackgrounds: true,
        galleryZipEnabled: true,
      };
    case "photographer-single":
      return {
        photoCap: null,
        aiCredits: 20,
        overlaysAll: true,
        premiumFilters: true,
        watermarkEnabled: false,
        smsEnabled: true,
        allowAiBackgrounds: true,
        galleryZipEnabled: true,
      };
    case "photographer-monthly":
      return {
        photoCap: null,
        aiCredits: 40,
        overlaysAll: true,
        premiumFilters: true,
        watermarkEnabled: false,
        smsEnabled: true,
        allowAiBackgrounds: true,
        galleryZipEnabled: true,
      };
    case "free":
    default:
      return {
        photoCap: 50,
        aiCredits: 0,
        overlaysAll: false,
        premiumFilters: false,
        watermarkEnabled: true,
        smsEnabled: false,
        allowAiBackgrounds: false,
        galleryZipEnabled: false,
      };
  }
}

function getFirestoreDb() {
  const { firestore } = getFirebaseAdmin();
  return firestore ?? getFirestore();
}

function userEventsCollection(uid: string) {
  return getFirestoreDb().collection(FIRESTORE_USERS).doc(uid).collection("events");
}

export async function listUserEvents(uid: string) {
  if (!uid) return [];
  const snap = await userEventsCollection(uid).get();
  return snap.docs.map((d) => withEventDefaults(d.data() as BoothEvent));
}

async function fetchEventBySlug(uid: string, slug: string) {
  if (!uid || !slug) return null;
  const snap = await userEventsCollection(uid).where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  return withEventDefaults(snap.docs[0].data() as BoothEvent);
}

async function upsertEventFirestore(uid: string, event: BoothEvent) {
  if (!uid || !event.id) return;
  await userEventsCollection(uid).doc(event.id).set(event, { merge: true });
}

async function deleteEventFromFirestore(uid: string, eventId: string) {
  if (!uid || !eventId) return;
  await userEventsCollection(uid).doc(eventId).delete();
}

async function resolveEmailsToUids(emails: string[]) {
  if (emails.length === 0) return [];
  const { auth } = getFirebaseAdmin();
  const results: string[] = [];
  for (const email of emails) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) continue;
    try {
      const user = await auth.getUserByEmail(normalized);
      results.push(user.uid);
    } catch {
      // ignore missing users
    }
  }
  return Array.from(new Set(results));
}

export function applyPlanDefaults(plan: BoothEventPlan) {
  const defaults = planDefaults(plan);
  return {
    plan,
    photoCap: defaults.photoCap ?? null,
    photoUsed: 0,
    aiCredits: defaults.aiCredits ?? 0,
    aiUsed: 0,
    overlaysAll: defaults.overlaysAll ?? false,
    premiumFilters: defaults.premiumFilters ?? false,
    watermarkEnabled: defaults.watermarkEnabled ?? true,
    brandingRemoval: defaults.watermarkEnabled === false,
    smsEnabled: defaults.smsEnabled ?? false,
    allowBackgroundRemoval: true,
    allowAiBackgrounds: defaults.allowAiBackgrounds ?? false,
    allowAiFilters: defaults.allowAiBackgrounds ?? false,
    galleryZipEnabled: plan !== "free",
  };
}

function slugify(input: string, fallback: string) {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function withEventDefaults(event: BoothEvent): BoothEvent {
  const plan = event.plan ?? "event-basic";
  const defaults = planDefaults(plan);
  return {
    ...event,
    plan,
    photoCap: event.photoCap ?? defaults.photoCap,
    photoUsed: event.photoUsed ?? 0,
    aiCredits: event.aiCredits ?? defaults.aiCredits,
    aiUsed: event.aiUsed ?? 0,
    mode: event.mode ?? "self-serve",
    overlayPack: event.overlayPack ?? "basic",
    overlaysAll: event.overlaysAll ?? defaults.overlaysAll ?? false,
    premiumFilters: event.premiumFilters ?? defaults.premiumFilters ?? false,
    watermarkEnabled: event.watermarkEnabled ?? defaults.watermarkEnabled ?? true,
    brandingRemoval: event.brandingRemoval ?? false,
    smsEnabled: event.smsEnabled ?? defaults.smsEnabled ?? false,
    galleryZipEnabled: event.galleryZipEnabled ?? false,
    customUrl: event.customUrl ?? "",
    analyticsEnabled: event.analyticsEnabled ?? false,
    allowBackgroundRemoval: event.allowBackgroundRemoval ?? true,
    allowAiBackgrounds: event.allowAiBackgrounds ?? defaults.allowAiBackgrounds ?? false,
    allowAiFilters: event.allowAiFilters ?? event.allowAiBackgrounds ?? false,
    deliveryEmail: event.deliveryEmail ?? true,
    deliverySms: event.deliverySms ?? (defaults.smsEnabled ?? false),
    overlayTheme: event.overlayTheme ?? "default",
    galleryPublic: event.galleryPublic ?? false,
    allowedSelections: event.allowedSelections ?? (event.mode === "photographer" ? 3 : undefined),
    paymentStatus: event.paymentStatus ?? (event.mode === "photographer" ? "unpaid" : "paid"),
  };
}

async function ensureTenantStorage() {
  await mkdir(STORAGE_ROOT, { recursive: true });
  try {
    await readFile(TENANT_FILE, "utf8");
    return;
  } catch {
    // Seed a default business/event so the app works out of the box.
    const businessName =
      process.env.BOOTHOS_DEFAULT_BUSINESS_NAME ?? "Arctic Aura Designs";
    const businessSlug = slugify(
      process.env.BOOTHOS_DEFAULT_BUSINESS_SLUG ?? "arctic-aura",
      "arctic-aura",
    );
    const eventName = process.env.BOOTHOS_DEFAULT_EVENT_NAME ?? "General Event";
    const eventSlug = slugify(
      process.env.BOOTHOS_DEFAULT_EVENT_SLUG ?? "default",
      "default",
    );
    const defaultPlan = "event-basic" as BoothEventPlan;
    const defaults = planDefaults(defaultPlan);
    const seedOwner = "seed-owner";

    const seed: TenantIndex = {
      businesses: [
        {
          id: randomUUID(),
          name: businessName,
          slug: businessSlug,
          createdAt: new Date().toISOString(),
          ownerUid: seedOwner,
          events: [
            {
              id: randomUUID(),
              name: eventName,
              slug: eventSlug,
              mode: "self-serve",
              status: "live",
              createdAt: new Date().toISOString(),
              plan: defaultPlan,
              photoCap: defaults.photoCap,
              photoUsed: 0,
              aiCredits: defaults.aiCredits,
              aiUsed: 0,
              ownerUid: seedOwner,
              roles: {},
              allowBackgroundRemoval: true,
              allowAiBackgrounds: false,
              allowAiFilters: false,
              deliveryEmail: true,
              deliverySms: false,
              overlayTheme: "default",
              galleryPublic: false,
            },
          ],
        },
      ],
    };
    await writeFile(TENANT_FILE, JSON.stringify(seed, null, 2), "utf8");
    // Also seed Firestore (user-centric; store under seed owner uid)
    const seededBiz = seed.businesses[0];
    await upsertEventFirestore(seededBiz.ownerUid ?? "seed-owner", seededBiz.events[0]);
  }
}

function isExpiredEvent(event: BoothEvent) {
  if (!event.eventDate) return false;
  const parsed = new Date(event.eventDate);
  if (Number.isNaN(parsed.getTime())) return false;
  const expire = new Date(parsed.getTime());
  expire.setHours(23, 59, 59, 999);
  expire.setDate(expire.getDate() + 7);
  return Date.now() > expire.getTime();
}

async function removeEventStorage(businessSlug: string, eventSlug: string) {
  const dir = path.join(STORAGE_ROOT, "tenants", businessSlug, eventSlug);
  await rm(dir, { recursive: true, force: true });
}

async function pruneExpiredEvents(index: TenantIndex) {
  let changed = false;
  for (const business of index.businesses) {
    const keep: BoothEvent[] = [];
    for (const event of business.events) {
      if (isExpiredEvent(event)) {
        changed = true;
        await removeEventStorage(business.slug, event.slug);
      } else {
        keep.push(event);
      }
    }
    business.events = keep;
  }
  if (changed) {
    await writeTenantIndex(index);
  }
}

async function readTenantIndex(): Promise<TenantIndex> {
  await ensureTenantStorage();
  const raw = await readFile(TENANT_FILE, "utf8");
  const parsed = JSON.parse(raw) as TenantIndex;
  await pruneExpiredEvents(parsed);
  parsed.businesses = parsed.businesses.map((business) => ({
    ...business,
    subscriptionStatus: business.subscriptionStatus ?? "canceled",
    events: business.events.map((event) => withEventDefaults(event)),
  }));
  return parsed;
}

async function writeTenantIndex(index: TenantIndex) {
  await writeFile(TENANT_FILE, JSON.stringify(index, null, 2), "utf8");
}
export { writeTenantIndex };

export async function listBusinesses(): Promise<BoothBusiness[]> {
  const index = await readTenantIndex();
  return index.businesses;
}

export async function findBusinessBySlug(slug: string) {
  const index = await readTenantIndex();
  return index.businesses.find((b) => b.slug === slugify(slug, slug));
}

export async function findBusinessById(id: string) {
  const index = await readTenantIndex();
  return index.businesses.find((b) => b.id === id);
}

export async function deleteEventById(businessId: string, eventId: string) {
  const events = await listUserEvents(businessId);
  const target = events.find((e) => e.id === eventId);
  if (!target) return false;
  await deleteEventFromFirestore(businessId, eventId);
  await removeEventStorage(businessId, target.slug);
  return true;
}

export async function createBusiness({
  name,
  slug,
  ownerUid,
}: {
  name: string;
  slug?: string;
  ownerUid: string;
}) {
  const index = await readTenantIndex();
  const safeSlug = slugify(slug || name, randomUUID());
  if (index.businesses.some((b) => b.slug === safeSlug)) {
    throw new Error("Business slug already exists.");
  }
  const business: BoothBusiness = {
    id: randomUUID(),
    name,
    slug: safeSlug,
    ownerUid,
    createdAt: new Date().toISOString(),
    events: [],
  };
  index.businesses.push(business);
  await writeTenantIndex(index);
  return { business };
}

export async function createEvent(
  _businessId: string,
  ownerUid: string,
  {
    name,
    slug,
    status = "live",
    mode = "self-serve",
    plan = "event-basic",
    photoCap,
    aiCredits,
    allowBackgroundRemoval = true,
    allowAiBackgrounds = false,
    allowAiFilters = false,
    deliveryEmail = true,
    deliverySms = false,
    overlayTheme = "default",
    overlayLogo,
    galleryPublic = false,
    eventDate,
    eventTime,
    allowedSelections,
    photographerEmails,
    reviewEmails,
  }: {
    name: string;
    slug?: string;
    status?: BoothEvent["status"];
    mode?: BoothEvent["mode"];
    plan?: BoothEventPlan;
    photoCap?: number | null;
    aiCredits?: number;
    allowBackgroundRemoval?: boolean;
    allowAiBackgrounds?: boolean;
    allowAiFilters?: boolean;
    deliveryEmail?: boolean;
    deliverySms?: boolean;
    overlayTheme?: string;
    overlayLogo?: string;
    galleryPublic?: boolean;
    eventDate?: string;
    eventTime?: string;
    allowedSelections?: number;
    photographerEmails?: string[];
    reviewEmails?: string[];
  },
) {
  const uid = ownerUid;
  const events = await listUserEvents(uid);
  let safeSlug = slugify(slug || name, randomUUID());
  const existingSlugs = new Set(events.map((e) => e.slug));
  while (existingSlugs.has(safeSlug)) {
    safeSlug = slugify(`${safeSlug}-${Math.floor(Math.random() * 9999)}`, randomUUID());
  }
  const defaults = planDefaults(plan);
  const roles = {
    photographer: await resolveEmailsToUids(photographerEmails || []),
    review: await resolveEmailsToUids(reviewEmails || []),
  };
  const event: BoothEvent = {
    id: randomUUID(),
    name,
    slug: safeSlug,
    mode,
    status,
    createdAt: new Date().toISOString(),
    plan,
    photoCap: photoCap ?? defaults.photoCap,
    photoUsed: 0,
    aiCredits: aiCredits ?? defaults.aiCredits,
    aiUsed: 0,
    allowBackgroundRemoval,
    allowAiBackgrounds,
    allowAiFilters,
    deliveryEmail,
    deliverySms,
    overlayTheme,
    overlayLogo,
    galleryPublic,
    eventDate,
    eventTime,
    allowedSelections,
    ownerUid,
    roles,
  };
  await upsertEventFirestore(uid, event);
  return { event };
}

function toScope(business: BoothBusiness, event: BoothEvent): TenantScope {
  return {
    businessId: business.id,
    businessSlug: business.slug,
    businessName: business.name,
    eventId: event.id,
    eventSlug: event.slug,
    eventName: event.name,
  };
}

function eventIsActive(event: BoothEvent) {
  if (event.status === "closed") return false;
  const now = Date.now();
  if (event.startsAt && new Date(event.startsAt).getTime() > now) return false;
  if (event.endsAt && new Date(event.endsAt).getTime() < now) return false;
  return true;
}

export async function findEventBySlugs(
  businessSlug: string,
  eventSlug: string,
): Promise<EventContext | null> {
  const normalizedBiz = slugify(businessSlug, businessSlug);
  const normalizedEvent = slugify(eventSlug, eventSlug);
  // User-centric: businessSlug is ignored; use caller's UID in getEventContext.
  return null;
}

export function scopedStorageRoot(scope: TenantScope) {
  return path.join(
    STORAGE_ROOT,
    "tenants",
    scope.businessSlug,
    scope.eventSlug,
  );
}

export function sanitizeBusiness(business: BoothBusiness) {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    createdAt: business.createdAt,
    ownerUid: business.ownerUid,
    subscriptionStatus: business.subscriptionStatus,
    subscriptionPlan: business.subscriptionPlan,
  };
}

export function sanitizeEvent(event: BoothEvent) {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    status: event.status,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    createdAt: event.createdAt,
    plan: event.plan,
    photoCap: event.photoCap,
    photoUsed: event.photoUsed,
    aiCredits: event.aiCredits,
    aiUsed: event.aiUsed,
    allowBackgroundRemoval: event.allowBackgroundRemoval,
    allowAiBackgrounds: event.allowAiBackgrounds,
    allowAiFilters: event.allowAiFilters,
    deliveryEmail: event.deliveryEmail,
    deliverySms: event.deliverySms,
    overlayTheme: event.overlayTheme,
    overlayLogo: event.overlayLogo,
    galleryPublic: event.galleryPublic,
    eventDate: event.eventDate,
    eventTime: event.eventTime,
    allowedSelections: event.allowedSelections,
    paymentStatus: event.paymentStatus,
    allowedBackgroundIds: event.allowedBackgroundIds,
    allowedFrameIds: event.allowedFrameIds,
    ownerUid: event.ownerUid,
    roles: event.roles ?? {},
  };
}

export function eventUsage(event: BoothEvent) {
  const defaults = planDefaults(event.plan ?? "event-basic");
  const cap = event.photoCap ?? defaults.photoCap ?? null;
  const used = event.photoUsed ?? 0;
  const aiCap = event.aiCredits ?? defaults.aiCredits ?? 0;
  const aiUsed = event.aiUsed ?? 0;
  return {
    photoCap: cap,
    photoUsed: used,
    remainingPhotos: cap === null ? null : Math.max(cap - used, 0),
    aiCredits: aiCap,
    aiUsed,
    remainingAi: Math.max(aiCap - aiUsed, 0),
    watermark: event.watermarkEnabled ?? defaults.watermarkEnabled ?? false,
    premiumFilters: event.premiumFilters ?? defaults.premiumFilters ?? false,
    overlaysAll: event.overlaysAll ?? defaults.overlaysAll ?? false,
    smsEnabled: event.smsEnabled ?? defaults.smsEnabled ?? false,
    allowAiBackgrounds: event.allowAiBackgrounds ?? defaults.allowAiBackgrounds ?? false,
    galleryZipEnabled: event.galleryZipEnabled ?? defaults.galleryZipEnabled ?? false,
    mode: event.mode ?? "self-serve",
    paymentStatus: event.paymentStatus ?? (event.mode === "photographer" ? "unpaid" : "paid"),
  };
}

export function isPhotographerPlan(plan?: BoothEventPlan) {
  return plan === "photographer-single" || plan === "photographer-monthly";
}

export function eventRequiresPayment(event: BoothEvent, business?: BoothBusiness) {
  if (event.mode === "photographer") {
    if (isPhotographerPlan(event.plan)) {
      if (event.plan === "photographer-monthly" && business?.subscriptionStatus === "active") {
        return false;
      }
      return event.paymentStatus !== "paid";
    }
    return true;
  }
  return false;
}

// Session cookies/key auth removed; Firebase ID tokens are now required.

export async function getEventContext(
  request: NextRequest,
): Promise<{ context?: EventContext; error?: string; status?: number }> {
  const user = await verifyBearer(request);
  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }
  const eventSlug =
    request.headers.get("x-boothos-event") ||
    request.nextUrl.searchParams.get("event") ||
    request.nextUrl.searchParams.get("slug") ||
    "";
  if (!eventSlug) {
    return { error: "Missing event", status: 400 };
  }
  const events = await listUserEvents(user.uid);
  const event = events.find((e) => e.slug === slugify(eventSlug, eventSlug));
  if (!event) return { error: "Event not found", status: 404 };
  const business: BoothBusiness = {
    id: user.uid,
    name: "My BoothOS",
    slug: user.uid,
    ownerUid: user.uid,
    createdAt: event.createdAt ?? new Date().toISOString(),
    events,
  };
  const roles = roleForEvent(event, user.uid);
  return {
    context: {
      business,
      event,
      scope: toScope(business, event),
      roles,
    },
  };
}

export async function getBusinessContext(request: NextRequest) {
  const user = await verifyBearer(request);
  if (!user) return null;
  const events = await listUserEvents(user.uid);
  const business: BoothBusiness = {
    id: user.uid,
    name: "My BoothOS",
    slug: user.uid,
    ownerUid: user.uid,
    createdAt: new Date().toISOString(),
    events,
    subscriptionStatus: "canceled",
  };
  return { business, user };
}

export function isAdminRequest(request: NextRequest) {
  const header = request.headers.get("x-admin-token");
  const query = request.nextUrl.searchParams.get("token");
  return header === ADMIN_TOKEN || query === ADMIN_TOKEN;
}

export const adminToken = ADMIN_TOKEN;

export async function updateEventStatus(
  businessId: string,
  eventId: string,
  status: BoothEvent["status"],
) {
  const events = await listUserEvents(businessId);
  const event = events.find((e) => e.id === eventId);
  if (!event) throw new Error("Event not found");
  const updated = { ...event, status };
  await upsertEventFirestore(businessId, updated);
  return updated;
}

export async function updateEventConfig(
  businessId: string,
  eventId: string,
  updates: Partial<BoothEvent>,
) {
  const events = await listUserEvents(businessId);
  const event = events.find((e) => e.id === eventId);
  if (!event) throw new Error("Event not found");
  const updated = withEventDefaults({ ...event, ...updates });
  await upsertEventFirestore(businessId, updated);
  return updated;
}

export async function updateBusinessSubscription(
  businessId: string,
  {
    subscriptionId,
    subscriptionStatus,
    subscriptionPlan,
  }: { subscriptionId?: string; subscriptionStatus?: BoothBusiness["subscriptionStatus"]; subscriptionPlan?: BoothEventPlan },
) {
  const index = await readTenantIndex();
  const business = index.businesses.find((b) => b.id === businessId);
  if (!business) throw new Error("Business not found");
  business.subscriptionId = subscriptionId ?? business.subscriptionId;
  business.subscriptionStatus = subscriptionStatus ?? business.subscriptionStatus ?? "canceled";
  business.subscriptionPlan = subscriptionPlan ?? business.subscriptionPlan;
  await writeTenantIndex(index);
  return business;
}

export async function incrementEventUsage(
  scope: TenantScope,
  { photos = 0, aiCredits = 0 }: { photos?: number; aiCredits?: number },
) {
  const events = await listUserEvents(scope.businessId);
  const event = events.find((e) => e.id === scope.eventId);
  if (!event) throw new Error("Event not found");
  const updated = withEventDefaults({
    ...event,
    photoUsed: Math.max(0, (event.photoUsed ?? 0) + photos),
    aiUsed: Math.max(0, (event.aiUsed ?? 0) + aiCredits),
  });
  await upsertEventFirestore(scope.businessId, updated);
  return { event: updated, usage: eventUsage(updated) };
}

export async function updateEventRolesByEmails(
  businessSlug: string,
  eventSlug: string,
  {
    photographerEmails = [],
    reviewEmails = [],
  }: { photographerEmails?: string[]; reviewEmails?: string[] },
) {
  const normalizedEvent = slugify(eventSlug, eventSlug);
  const ownerUid = businessSlug; // now user-centric; businessSlug carries uid from caller context
  const events = await listUserEvents(ownerUid);
  const event = events.find((e) => e.slug === normalizedEvent);
  if (!event) throw new Error("Event not found");
  const photographer = await resolveEmailsToUids(photographerEmails);
  const review = await resolveEmailsToUids(reviewEmails);
  event.roles = { photographer, review };

  await upsertEventFirestore(ownerUid, event);

  return event;
}
