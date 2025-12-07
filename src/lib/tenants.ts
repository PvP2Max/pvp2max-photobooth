import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";

export type BoothEvent = {
  id: string;
  name: string;
  slug: string;
  accessHash: string;
  accessHint: string;
  status: "draft" | "live" | "closed";
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
};

export type BoothBusiness = {
  id: string;
  name: string;
  slug: string;
  apiKeyHash: string;
  apiKeyHint: string;
  createdAt: string;
  events: BoothEvent[];
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
  expiresAt?: string;
};

type TenantIndex = {
  businesses: BoothBusiness[];
};

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const TENANT_FILE = path.join(STORAGE_ROOT, "tenants.json");
const SESSION_COOKIE_NAME = "boothos_session";
const ADMIN_TOKEN = process.env.BOOTHOS_ADMIN_TOKEN ?? "ArcticAuraDesigns";
const SESSION_SECRET = process.env.BOOTHOS_SESSION_SECRET ?? "boothos-dev-session-secret";
const SESSION_TTL_HOURS = Number(process.env.BOOTHOS_SESSION_TTL_HOURS ?? "12");

function slugify(input: string, fallback: string) {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function secretHint(secret: string) {
  const trimmed = secret.trim();
  return trimmed.slice(-4) || "????";
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
    const businessKey =
      process.env.BOOTHOS_DEFAULT_BUSINESS_KEY ??
      process.env.BOOTHOS_DEFAULT_EVENT_KEY ??
      "boothos-default-business-key";

    const eventName = process.env.BOOTHOS_DEFAULT_EVENT_NAME ?? "General Event";
    const eventSlug = slugify(
      process.env.BOOTHOS_DEFAULT_EVENT_SLUG ?? "default",
      "default",
    );
    const eventKey =
      process.env.BOOTHOS_DEFAULT_EVENT_KEY ?? "boothos-default-event-key";

    const seed: TenantIndex = {
      businesses: [
        {
          id: randomUUID(),
          name: businessName,
          slug: businessSlug,
          apiKeyHash: hashSecret(businessKey),
          apiKeyHint: secretHint(businessKey),
          createdAt: new Date().toISOString(),
          events: [
            {
              id: randomUUID(),
              name: eventName,
              slug: eventSlug,
              accessHash: hashSecret(eventKey),
              accessHint: secretHint(eventKey),
              status: "live",
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ],
    };
    await writeFile(TENANT_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readTenantIndex(): Promise<TenantIndex> {
  await ensureTenantStorage();
  const raw = await readFile(TENANT_FILE, "utf8");
  return JSON.parse(raw) as TenantIndex;
}

async function writeTenantIndex(index: TenantIndex) {
  await writeFile(TENANT_FILE, JSON.stringify(index, null, 2), "utf8");
}

export async function listBusinesses(): Promise<BoothBusiness[]> {
  const index = await readTenantIndex();
  return index.businesses;
}

export async function createBusiness({
  name,
  slug,
  apiKey,
}: {
  name: string;
  slug?: string;
  apiKey?: string;
}) {
  const index = await readTenantIndex();
  const safeSlug = slugify(slug || name, randomUUID());
  const secret = apiKey || randomUUID().replace(/-/g, "");
  if (index.businesses.some((b) => b.slug === safeSlug)) {
    throw new Error("Business slug already exists.");
  }
  const business: BoothBusiness = {
    id: randomUUID(),
    name,
    slug: safeSlug,
    apiKeyHash: hashSecret(secret),
    apiKeyHint: secretHint(secret),
    createdAt: new Date().toISOString(),
    events: [],
  };
  index.businesses.push(business);
  await writeTenantIndex(index);
  return { business, apiKey: secret };
}

export async function createEvent(
  businessId: string,
  {
    name,
    slug,
    accessCode,
    status = "live",
  }: { name: string; slug?: string; accessCode?: string; status?: BoothEvent["status"] },
) {
  const index = await readTenantIndex();
  const business = index.businesses.find((b) => b.id === businessId);
  if (!business) throw new Error("Business not found");
  const safeSlug = slugify(slug || name, randomUUID());
  const code = accessCode || randomUUID().replace(/-/g, "");
  if (business.events.some((e) => e.slug === safeSlug)) {
    throw new Error("Event slug already exists for this business.");
  }
  const event: BoothEvent = {
    id: randomUUID(),
    name,
    slug: safeSlug,
    accessHash: hashSecret(code),
    accessHint: secretHint(code),
    status,
    createdAt: new Date().toISOString(),
  };
  business.events.push(event);
  await writeTenantIndex(index);
  return { event, accessCode: code };
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

async function findEventBySlugs(
  businessSlug: string,
  eventSlug: string,
): Promise<EventContext | null> {
  const index = await readTenantIndex();
  const biz = index.businesses.find((b) => b.slug === slugify(businessSlug, businessSlug));
  if (!biz) return null;
  const event = biz.events.find((e) => e.slug === slugify(eventSlug, eventSlug));
  if (!event) return null;
  if (!eventIsActive(event)) return null;
  return { business: biz, event, scope: toScope(biz, event) };
}

async function findEventByIds(
  businessId: string,
  eventId: string,
): Promise<EventContext | null> {
  const index = await readTenantIndex();
  const biz = index.businesses.find((b) => b.id === businessId);
  if (!biz) return null;
  const event = biz.events.find((e) => e.id === eventId);
  if (!event || !eventIsActive(event)) return null;
  return { business: biz, event, scope: toScope(biz, event) };
}

export async function verifyEventAccess({
  businessSlug,
  eventSlug,
  accessCode,
}: {
  businessSlug: string;
  eventSlug: string;
  accessCode: string;
}): Promise<EventContext | null> {
  const context = await findEventBySlugs(businessSlug, eventSlug);
  if (!context) return null;
  const hashed = hashSecret(accessCode);
  const expected = context.event.accessHash;
  if (!timingSafeEqual(Buffer.from(hashed), Buffer.from(expected))) {
    return null;
  }
  return context;
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
    apiKeyHint: business.apiKeyHint,
    createdAt: business.createdAt,
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
    accessHint: event.accessHint,
    createdAt: event.createdAt,
  };
}

export function createSessionToken(scope: TenantScope) {
  const exp = Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000;
  const payload = Buffer.from(
    JSON.stringify({
      bid: scope.businessId,
      eid: scope.eventId,
      exp,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  return { token: `${payload}.${signature}`, expiresAt: new Date(exp).toISOString() };
}

export async function contextFromSessionToken(token: string): Promise<EventContext | null> {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  const expected = createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  let payload: { bid: string; eid: string; exp?: number };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      bid: string;
      eid: string;
      exp?: number;
    };
  } catch {
    return null;
  }
  if (!payload.bid || !payload.eid) return null;
  if (payload.exp && payload.exp < Date.now()) return null;
  const context = await findEventByIds(payload.bid, payload.eid);
  if (!context) return null;
  return { ...context, expiresAt: payload.exp ? new Date(payload.exp).toISOString() : undefined };
}

export async function getEventContext(
  request: NextRequest,
  options?: { allowUnauthedHeader?: boolean },
): Promise<{ context?: EventContext; error?: string; status?: number }> {
  await ensureTenantStorage();

  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) {
    const context = await contextFromSessionToken(cookieToken);
    if (context) return { context };
  }

  const businessSlug =
    request.headers.get("x-boothos-business") ||
    request.nextUrl.searchParams.get("business") ||
    "";
  const eventSlug =
    request.headers.get("x-boothos-event") ||
    request.nextUrl.searchParams.get("event") ||
    "";
  const accessCode =
    request.headers.get("x-boothos-key") ||
    request.headers.get("x-event-key") ||
    request.nextUrl.searchParams.get("key") ||
    "";

  if (businessSlug && eventSlug && accessCode) {
    const verified = await verifyEventAccess({
      businessSlug,
      eventSlug,
      accessCode,
    });
    if (verified) return { context: verified };
    return { error: "Unauthorized event access.", status: 401 };
  }

  if (options?.allowUnauthedHeader && businessSlug && eventSlug) {
    const ctx = await findEventBySlugs(businessSlug, eventSlug);
    if (ctx) return { context: ctx };
  }

  return {
    error: "Missing event session. Authenticate with an event key.",
    status: 401,
  };
}

export function isAdminRequest(request: NextRequest) {
  const header = request.headers.get("x-admin-token");
  const query = request.nextUrl.searchParams.get("token");
  return header === ADMIN_TOKEN || query === ADMIN_TOKEN;
}

export const sessionCookieName = SESSION_COOKIE_NAME;
export const adminToken = ADMIN_TOKEN;
