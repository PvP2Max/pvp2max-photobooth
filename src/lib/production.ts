import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { TenantScope, scopedStorageRoot } from "./tenants";

export type ProductionAttachment = {
  filename: string;
  path: string;
  contentType: string;
  size: number;
};

export type ProductionSet = {
  id: string;
  email: string;
  createdAt: string;
  downloadToken: string;
  tokenExpiresAt: string;
  attachments: ProductionAttachment[];
  businessId?: string;
  eventId?: string;
};

type ProductionIndex = {
  items: ProductionSet[];
};

function productionPaths(scope: TenantScope) {
  const root = scopedStorageRoot(scope);
  const dir = path.join(root, "production");
  const index = path.join(dir, "production.json");
  return { dir, index };
}

async function ensureProductionStorage(scope: TenantScope) {
  const { dir, index } = productionPaths(scope);
  await mkdir(dir, { recursive: true });
  try {
    await readFile(index, "utf8");
  } catch {
    const seed: ProductionIndex = { items: [] };
    await writeFile(index, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readIndex(scope: TenantScope): Promise<ProductionIndex> {
  await ensureProductionStorage(scope);
  const { index } = productionPaths(scope);
  try {
    const raw = await readFile(index, "utf8");
    return JSON.parse(raw) as ProductionIndex;
  } catch (error) {
    console.error("Failed to read production index", error);
    return { items: [] };
  }
}

async function writeIndex(index: ProductionIndex, scope: TenantScope) {
  const { index: indexFile } = productionPaths(scope);
  await writeFile(indexFile, JSON.stringify(index, null, 2), "utf8");
}

export async function saveProduction(
  scope: TenantScope,
  email: string,
  attachments: { filename: string; content: Buffer; contentType: string }[],
  ttlHours = 72,
) {
  await ensureProductionStorage(scope);
  const index = await readIndex(scope);
  const id = randomUUID();
  const downloadToken = randomUUID();
  const tokenExpiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  const { dir } = productionPaths(scope);
  const folder = path.join(dir, id);
  await mkdir(folder, { recursive: true });

  const savedAttachments: ProductionAttachment[] = [];
  for (const attachment of attachments) {
    const target = path.join(folder, attachment.filename);
    await writeFile(target, attachment.content);
    const fileStat = await stat(target);
    savedAttachments.push({
      filename: attachment.filename,
      path: target,
      contentType: attachment.contentType,
      size: fileStat.size,
    });
  }

  const record: ProductionSet = {
    id,
    email,
    createdAt: new Date().toISOString(),
    downloadToken,
    tokenExpiresAt,
    attachments: savedAttachments,
    businessId: scope.businessId,
    eventId: scope.eventId,
  };
  index.items.unshift(record);
  await writeIndex(index, scope);
  return record;
}

export async function listProduction(scope: TenantScope): Promise<ProductionSet[]> {
  const index = await readIndex(scope);
  return index.items;
}

export async function deleteProduction(scope: TenantScope, id: string) {
  const index = await readIndex(scope);
  const remaining = index.items.filter((item) => item.id !== id);
  const removed = index.items.find((item) => item.id === id);
  if (removed) {
    const { dir } = productionPaths(scope);
    await rm(path.join(dir, id), { recursive: true, force: true });
  }
  await writeIndex({ items: remaining }, scope);
}

export async function deleteAllProduction(scope: TenantScope) {
  const index = await readIndex(scope);
  const { dir } = productionPaths(scope);
  for (const item of index.items) {
    await rm(path.join(dir, item.id), { recursive: true, force: true });
  }
  await writeIndex({ items: [] }, scope);
}

export async function getProductionAttachment(scope: TenantScope, id: string, filename: string) {
  const index = await readIndex(scope);
  const item = index.items.find((i) => i.id === id);
  if (!item) return null;
  const attachment = item.attachments.find((a) => a.filename === filename);
  if (!attachment) return null;
  const buffer = await readFile(attachment.path);
  return {
    buffer,
    contentType: attachment.contentType,
    filename: attachment.filename,
  };
}

export async function findProductionById(scope: TenantScope, id: string) {
  const index = await readIndex(scope);
  return index.items.find((i) => i.id === id);
}

export async function verifyProductionToken(scope: TenantScope, id: string, token: string) {
  const record = await findProductionById(scope, id);
  if (!record) return null;
  const now = Date.now();
  const expires = new Date(record.tokenExpiresAt).getTime();
  if (token !== record.downloadToken || (expires && expires < now)) {
    return null;
  }
  return record;
}

export function productionRoot(scope: TenantScope) {
  const { dir } = productionPaths(scope);
  return dir;
}
