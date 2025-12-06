import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

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
};

type ProductionIndex = {
  items: ProductionSet[];
};

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const PRODUCTION_DIR = path.join(STORAGE_ROOT, "production");
const INDEX_FILE = path.join(PRODUCTION_DIR, "production.json");

async function ensureProductionStorage() {
  await mkdir(PRODUCTION_DIR, { recursive: true });
  try {
    await readFile(INDEX_FILE, "utf8");
  } catch {
    const seed: ProductionIndex = { items: [] };
    await writeFile(INDEX_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readIndex(): Promise<ProductionIndex> {
  await ensureProductionStorage();
  try {
    const raw = await readFile(INDEX_FILE, "utf8");
    return JSON.parse(raw) as ProductionIndex;
  } catch (error) {
    console.error("Failed to read production index", error);
    return { items: [] };
  }
}

async function writeIndex(index: ProductionIndex) {
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), "utf8");
}

export async function saveProduction(email: string, attachments: { filename: string; content: Buffer; contentType: string }[], ttlHours = 72) {
  await ensureProductionStorage();
  const index = await readIndex();
  const id = randomUUID();
  const downloadToken = randomUUID();
  const tokenExpiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  const folder = path.join(PRODUCTION_DIR, id);
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
  };
  index.items.unshift(record);
  await writeIndex(index);
  return record;
}

export async function listProduction(): Promise<ProductionSet[]> {
  const index = await readIndex();
  return index.items;
}

export async function deleteProduction(id: string) {
  const index = await readIndex();
  const remaining = index.items.filter((item) => item.id !== id);
  const removed = index.items.find((item) => item.id === id);
  if (removed) {
    await rm(path.join(PRODUCTION_DIR, id), { recursive: true, force: true });
  }
  await writeIndex({ items: remaining });
}

export async function deleteAllProduction() {
  const index = await readIndex();
  for (const item of index.items) {
    await rm(path.join(PRODUCTION_DIR, item.id), { recursive: true, force: true });
  }
  await writeIndex({ items: [] });
}

export async function getProductionAttachment(id: string, filename: string) {
  const index = await readIndex();
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

export async function findProductionById(id: string) {
  const index = await readIndex();
  return index.items.find((i) => i.id === id);
}

export async function verifyProductionToken(id: string, token: string) {
  const record = await findProductionById(id);
  if (!record) return null;
  const now = Date.now();
  const expires = new Date(record.tokenExpiresAt).getTime();
  if (token !== record.downloadToken || (expires && expires < now)) {
    return null;
  }
  return record;
}

export function productionRoot() {
  return PRODUCTION_DIR;
}
