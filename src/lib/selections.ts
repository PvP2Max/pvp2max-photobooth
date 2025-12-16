import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TenantScope, scopedStorageRoot } from "./tenants";

export type SelectionToken = {
  token: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  ownerUid?: string;
  eventId?: string;
};

type SelectionIndex = {
  tokens: SelectionToken[];
};

function selectionPaths(scope: TenantScope) {
  const root = scopedStorageRoot(scope);
  const dir = path.join(root, "selections");
  const index = path.join(dir, "tokens.json");
  return { dir, index };
}

async function ensureStorage(scope: TenantScope) {
  const { dir, index } = selectionPaths(scope);
  await mkdir(dir, { recursive: true });
  try {
    await readFile(index, "utf8");
  } catch {
    const seed: SelectionIndex = { tokens: [] };
    await writeFile(index, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readIndex(scope: TenantScope): Promise<SelectionIndex> {
  await ensureStorage(scope);
  const { index } = selectionPaths(scope);
  try {
    const raw = await readFile(index, "utf8");
    return JSON.parse(raw) as SelectionIndex;
  } catch {
    return { tokens: [] };
  }
}

async function writeIndex(index: SelectionIndex, scope: TenantScope) {
  const { index: idx } = selectionPaths(scope);
  await writeFile(idx, JSON.stringify(index, null, 2), "utf8");
}

export async function createSelectionToken(scope: TenantScope, email: string, ttlHours = 72) {
  const index = await readIndex(scope);
  const now = Date.now();
  const expiresAt = new Date(now + ttlHours * 60 * 60 * 1000).toISOString();
  const token: SelectionToken = {
    token: randomUUID(),
    email,
    createdAt: new Date().toISOString(),
    expiresAt,
    ownerUid: scope.ownerUid,
    eventId: scope.eventId,
  };
  index.tokens.push(token);
  await writeIndex(index, scope);
  return token;
}

export async function findSelectionToken(scope: TenantScope, token: string) {
  const index = await readIndex(scope);
  const found = index.tokens.find((t) => t.token === token);
  if (!found) return null;
  if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) return null;
  return found;
}

export async function markSelectionUsed(scope: TenantScope, token: string) {
  const index = await readIndex(scope);
  const entry = index.tokens.find((t) => t.token === token);
  if (entry) {
    entry.usedAt = new Date().toISOString();
    await writeIndex(index, scope);
  }
}
