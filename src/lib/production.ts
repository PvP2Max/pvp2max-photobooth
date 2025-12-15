import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import archiver from "archiver";
import { uploadToR2, fetchFromR2, deleteFromR2 } from "./r2";
import { TenantScope, scopedStorageRoot } from "./tenants";

const R2_PREFIX = (process.env.R2_KEY_PREFIX || "boothos").replace(/\/+$/, "");

export type ProductionAttachment = {
  filename: string;
  r2Key: string;
  url?: string | null;
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
  downloadCount?: number;
  lastDownloadedAt?: string;
  downloadEvents?: { at: string; ip?: string }[];
  bundleKey?: string;
  bundleUrl?: string | null;
  bundleFilename?: string;
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
  await mkdir(dir, { recursive: true });

  const savedAttachments: ProductionAttachment[] = [];
  for (const attachment of attachments) {
    const key = [R2_PREFIX, "production", id, attachment.filename].filter(Boolean).join("/");
    const { url } = await uploadToR2({
      key,
      body: attachment.content,
      contentType: attachment.contentType,
      cacheControl: "public, max-age=604800",
    });
    savedAttachments.push({
      filename: attachment.filename,
      r2Key: key,
      url,
      contentType: attachment.contentType,
      size: attachment.content.length,
    });
  }

  // Bundle all attachments into a single zip for a one-click download.
  const bundleFilename = "photos.zip";
  const bundleBuffer = await buildZip(attachments);
  const bundleKey = [R2_PREFIX, "production", id, bundleFilename].filter(Boolean).join("/");
  const { url: bundleUrl } = await uploadToR2({
    key: bundleKey,
    body: bundleBuffer,
    contentType: "application/zip",
    cacheControl: "public, max-age=604800",
  });

  const record: ProductionSet = {
    id,
    email,
    createdAt: new Date().toISOString(),
    downloadToken,
    tokenExpiresAt,
    attachments: savedAttachments,
    businessId: scope.businessId,
    eventId: scope.eventId,
    downloadCount: 0,
    downloadEvents: [],
    bundleKey,
    bundleUrl,
    bundleFilename,
  };
  index.items.unshift(record);
  await writeIndex(index, scope);
  return record;
}

export async function listProduction(scope: TenantScope): Promise<ProductionSet[]> {
  await purgeExpiredProduction(scope);
  const index = await readIndex(scope);
  return index.items;
}

export async function deleteProduction(scope: TenantScope, id: string) {
  const index = await readIndex(scope);
  const remaining = index.items.filter((item) => item.id !== id);
  const removed = index.items.find((item) => item.id === id);
  if (removed) {
    const keys = [
      ...removed.attachments.map((a) => a.r2Key).filter(Boolean),
      ...(removed.bundleKey ? [removed.bundleKey] : []),
    ];
    await deleteFromR2(keys);
  }
  await writeIndex({ items: remaining }, scope);
}

export async function deleteAllProduction(scope: TenantScope) {
  const index = await readIndex(scope);
  const keys = index.items.flatMap((item) => [
    ...item.attachments.map((a) => a.r2Key).filter(Boolean),
    ...(item.bundleKey ? [item.bundleKey] : []),
  ]);
  await deleteFromR2(keys);
  await writeIndex({ items: [] }, scope);
}

export async function getProductionAttachment(scope: TenantScope, id: string, filename: string) {
  const index = await readIndex(scope);
  const item = index.items.find((i) => i.id === id);
  if (!item) return null;
  const isBundle = item.bundleFilename && filename === item.bundleFilename;
  if (isBundle && item.bundleKey) {
    const blob = await fetchFromR2(item.bundleKey);
    return {
      buffer: blob.buffer,
      contentType: blob.contentType,
      filename: item.bundleFilename,
    };
  }
  const attachment = item.attachments.find((a) => a.filename === filename);
  if (!attachment) return null;
  const legacyPath = (attachment as { path?: string }).path;
  if (!attachment.r2Key && legacyPath) {
    // Legacy local path fallback
    const buffer = await readFile(legacyPath);
    return {
      buffer,
      contentType: attachment.contentType,
      filename: attachment.filename,
    };
  }
  const blob = await fetchFromR2(attachment.r2Key);
  return {
    buffer: blob.buffer,
    contentType: blob.contentType || attachment.contentType,
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
    // Clean expired records opportunistically
    if (expires && expires < now) {
      await purgeExpiredProduction(scope);
    }
    return null;
  }
  return record;
}

export async function recordDownload(scope: TenantScope, id: string, ip?: string) {
  const index = await readIndex(scope);
  const record = index.items.find((i) => i.id === id);
  if (!record) return;
  const at = new Date().toISOString();
  record.downloadCount = (record.downloadCount ?? 0) + 1;
  record.lastDownloadedAt = at;
  const history = record.downloadEvents ?? [];
  history.unshift({ at, ip });
  record.downloadEvents = history.slice(0, 25);
  await writeIndex(index, scope);
}

export function productionRoot(scope: TenantScope) {
  const { dir } = productionPaths(scope);
  return dir;
}

export async function purgeExpiredProduction(scope: TenantScope) {
  const index = await readIndex(scope);
  const now = Date.now();
  const keep: ProductionSet[] = [];
  const expired: ProductionSet[] = [];
  for (const item of index.items) {
    const exp = new Date(item.tokenExpiresAt).getTime();
    if (exp && exp < now) {
      expired.push(item);
    } else {
      keep.push(item);
    }
  }
  if (expired.length > 0) {
    for (const item of expired) {
      const keys = [
        ...item.attachments.map((a) => a.r2Key).filter(Boolean),
        ...(item.bundleKey ? [item.bundleKey] : []),
      ];
      await deleteFromR2(keys);
    }
    await writeIndex({ items: keep }, scope);
  }
}

async function buildZip(files: { filename: string; content: Buffer }[]) {
  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on("error", reject);
    archive.on("data", (data) => {
      chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    for (const file of files) {
      archive.append(file.content, { name: file.filename });
    }
    archive.finalize().catch(reject);
  });
}
