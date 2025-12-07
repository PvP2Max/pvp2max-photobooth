import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeEmail } from "./storage";
import { TenantScope, scopedStorageRoot } from "./tenants";

export type Checkin = {
  id: string;
  name: string;
  email: string;
  businessId?: string;
  eventId?: string;
  createdAt: string;
};

type CheckinIndex = {
  checkins: Checkin[];
};

function checkinPaths(scope: TenantScope) {
  const root = scopedStorageRoot(scope);
  const dir = path.join(root, "checkins");
  const index = path.join(dir, "checkins.json");
  return { dir, index };
}

async function ensureStorage(scope: TenantScope) {
  const { dir, index } = checkinPaths(scope);
  await mkdir(dir, { recursive: true });
  try {
    await readFile(index, "utf8");
  } catch {
    const seed: CheckinIndex = { checkins: [] };
    await writeFile(index, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readIndex(scope: TenantScope): Promise<CheckinIndex> {
  await ensureStorage(scope);
  const { index } = checkinPaths(scope);
  try {
    const raw = await readFile(index, "utf8");
    return JSON.parse(raw) as CheckinIndex;
  } catch (error) {
    console.error("Failed to read checkins index", error);
    return { checkins: [] };
  }
}

async function writeIndex(index: CheckinIndex, scope: TenantScope) {
  const { index: indexFile } = checkinPaths(scope);
  await writeFile(indexFile, JSON.stringify(index, null, 2), "utf8");
}

export async function listCheckins(scope: TenantScope): Promise<Checkin[]> {
  const index = await readIndex(scope);
  return [...index.checkins].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function addCheckin(
  scope: TenantScope,
  {
    name,
    email,
  }: {
    name: string;
    email: string;
  },
): Promise<Checkin> {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex(scope);
  const existing = index.checkins.find((c) => c.email === normalizedEmail);

  if (existing) {
    const updated: Checkin = {
      ...existing,
      name,
      createdAt: new Date().toISOString(),
      businessId: scope.businessId,
      eventId: scope.eventId,
    };
    index.checkins = index.checkins
      .filter((c) => c.email !== normalizedEmail)
      .concat(updated);
    await writeIndex(index, scope);
    return updated;
  }

  const checkin: Checkin = {
    id: randomUUID(),
    name,
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    businessId: scope.businessId,
    eventId: scope.eventId,
  };

  index.checkins.push(checkin);
  await writeIndex(index, scope);
  return checkin;
}

export async function removeCheckinByEmail(scope: TenantScope, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex(scope);
  const remaining = index.checkins.filter((c) => c.email !== normalizedEmail);
  await writeIndex({ checkins: remaining }, scope);
  return remaining;
}
