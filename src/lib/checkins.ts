import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeEmail } from "./storage";

export type Checkin = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type CheckinIndex = {
  checkins: Checkin[];
};

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const CHECKIN_DIR = path.join(STORAGE_ROOT, "checkins");
const INDEX_FILE = path.join(CHECKIN_DIR, "checkins.json");

async function ensureStorage() {
  await mkdir(CHECKIN_DIR, { recursive: true });
  try {
    await readFile(INDEX_FILE, "utf8");
  } catch {
    const seed: CheckinIndex = { checkins: [] };
    await writeFile(INDEX_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readIndex(): Promise<CheckinIndex> {
  await ensureStorage();
  try {
    const raw = await readFile(INDEX_FILE, "utf8");
    return JSON.parse(raw) as CheckinIndex;
  } catch (error) {
    console.error("Failed to read checkins index", error);
    return { checkins: [] };
  }
}

async function writeIndex(index: CheckinIndex) {
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), "utf8");
}

export async function listCheckins(): Promise<Checkin[]> {
  const index = await readIndex();
  return [...index.checkins].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function addCheckin({
  name,
  email,
}: {
  name: string;
  email: string;
}): Promise<Checkin> {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex();
  const existing = index.checkins.find((c) => c.email === normalizedEmail);

  if (existing) {
    const updated: Checkin = {
      ...existing,
      name,
      createdAt: new Date().toISOString(),
    };
    index.checkins = index.checkins
      .filter((c) => c.email !== normalizedEmail)
      .concat(updated);
    await writeIndex(index);
    return updated;
  }

  const checkin: Checkin = {
    id: randomUUID(),
    name,
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
  };

  index.checkins.push(checkin);
  await writeIndex(index);
  return checkin;
}

export async function removeCheckinByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex();
  const remaining = index.checkins.filter((c) => c.email !== normalizedEmail);
  await writeIndex({ checkins: remaining });
  return remaining;
}
