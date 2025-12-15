import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { uploadToR2 } from "./r2";
import { TenantScope, scopedStorageRoot } from "./tenants";

const R2_PREFIX = (process.env.R2_KEY_PREFIX || "boothos").replace(/\/+$/, "");

export type PhotoRecord = {
  id: string;
  email: string;
  originalName: string;
  originalContentType: string;
  cutoutContentType: string;
  createdAt: string;
  originalPath?: string;
  cutoutPath?: string;
  previewPath?: string;
  previewContentType?: string;
  originalUrl?: string;
  cutoutUrl?: string;
  previewUrl?: string;
  businessId?: string;
  eventId?: string;
  mode?: "self-serve" | "photographer";
  overlayPack?: string;
  filterUsed?: string;
};

export type PublicPhoto = {
  id: string;
  email: string;
  originalName: string;
  createdAt: string;
  originalUrl: string;
  cutoutUrl: string;
  previewUrl?: string;
};

type IndexFile = {
  photos: PhotoRecord[];
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function photoPaths(scope: TenantScope) {
  const root = scopedStorageRoot(scope);
  const photoDir = path.join(root, "photos");
  const index = path.join(root, "photos.json");
  return { root, photoDir, index };
}

async function ensureStorage(scope: TenantScope) {
  const { photoDir, index } = photoPaths(scope);
  await mkdir(photoDir, { recursive: true });
  try {
    await readFile(index, "utf8");
  } catch {
    const seed: IndexFile = { photos: [] };
    await writeFile(index, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readIndex(scope: TenantScope): Promise<IndexFile> {
  await ensureStorage(scope);
  const { index } = photoPaths(scope);
  try {
    const raw = await readFile(index, "utf8");
    return JSON.parse(raw) as IndexFile;
  } catch (error) {
    console.error("Failed to read storage index", error);
    return { photos: [] };
  }
}

async function writeIndex(index: IndexFile, scope: TenantScope) {
  const { index: indexFile } = photoPaths(scope);
  await writeFile(indexFile, JSON.stringify(index, null, 2), "utf8");
}

function photoDir(scope: TenantScope, id: string) {
  const { photoDir } = photoPaths(scope);
  return path.join(photoDir, id);
}

function toPublicPhoto(record: PhotoRecord): PublicPhoto {
  const cutoutUrl = record.cutoutUrl ?? `/api/media/${record.id}/cutout`;
  const previewUrl =
    record.previewUrl ??
    record.cutoutUrl ??
    (record.previewPath ? `/api/media/${record.id}/preview` : cutoutUrl);
  const originalUrl =
    record.originalUrl ??
    (record.originalPath ? `/api/media/${record.id}/original` : cutoutUrl);

  return {
    id: record.id,
    email: record.email,
    originalName: record.originalName,
    createdAt: record.createdAt,
    originalUrl,
    cutoutUrl,
    previewUrl,
  };
}

async function ensureCutoutPreview(scope: TenantScope, record: PhotoRecord) {
  if (record.previewUrl || record.cutoutUrl) {
    return record;
  }
  if (record.previewPath) {
    try {
      await stat(record.previewPath);
      return record;
    } catch {
      // fall through and regenerate
    }
  }
  if (!record.cutoutPath) {
    return record;
  }
  try {
    const previewPath = path.join(photoDir(scope, record.id), "cutout-preview.webp");
    await sharp(record.cutoutPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(previewPath);
    record.previewPath = previewPath;
    record.previewContentType = "image/webp";
    const index = await readIndex(scope);
    const idx = index.photos.findIndex((p) => p.id === record.id);
    if (idx >= 0) {
      index.photos[idx].previewPath = previewPath;
      index.photos[idx].previewContentType = "image/webp";
      await writeIndex(index, scope);
    }
  } catch (error) {
    console.error("Failed to generate cutout preview", { id: record.id, error });
  }
  return record;
}

export async function savePhoto({
  email,
  file,
  cutoutUrl,
  cutoutContentType,
  scope,
  overlayPack,
  filterUsed,
  mode,
}: {
  email: string;
  file: File;
  cutoutUrl: string;
  cutoutContentType: string;
  scope: TenantScope;
  overlayPack?: string;
  filterUsed?: string;
  mode?: "self-serve" | "photographer";
}) {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex(scope);

  const id = randomUUID();
  const originalContentType = (file as Blob).type || "application/octet-stream";

  const record: PhotoRecord = {
    id,
    email: normalizedEmail,
    originalName: (file as File).name || "upload",
    originalUrl: cutoutUrl,
    cutoutUrl,
    previewUrl: cutoutUrl,
    originalContentType,
    cutoutContentType,
    createdAt: new Date().toISOString(),
    businessId: scope.businessId,
    eventId: scope.eventId,
    overlayPack,
    filterUsed,
    mode,
  };

  // Upload the cutout to our R2 bucket (so we control retention), falling back to service URL on failure.
  try {
    const { buffer, contentType } = await loadRemote(cutoutUrl, cutoutContentType);
    const keyParts = [
      R2_PREFIX,
      scope.businessId || "unknown-biz",
      scope.eventId || "unknown-event",
      `${id}-cutout.png`,
    ].filter(Boolean);
    const key = keyParts.join("/");
    const uploaded = await uploadToR2({
      key,
      body: buffer,
      contentType: contentType || "image/png",
      cacheControl: "public, max-age=31536000, immutable",
    });
    if (uploaded.url) {
      record.cutoutUrl = uploaded.url;
      record.previewUrl = uploaded.url;
      record.originalUrl = uploaded.url;
      record.cutoutContentType = contentType || "image/png";
    }
  } catch (error) {
    console.error("Failed to mirror cutout to R2, using service URL", { error });
  }

  index.photos.push(record);
  await writeIndex(index, scope);

  return toPublicPhoto(record);
}

export async function listPhotosByEmail(
  scope: TenantScope,
  email: string,
): Promise<PublicPhoto[]> {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex(scope);
  const filtered = index.photos.filter((photo) => photo.email === normalizedEmail);
  return Promise.all(
    filtered.map(async (photo) => toPublicPhoto(await ensureCutoutPreview(scope, photo))),
  );
}

export async function listPhotoIdsByEmail(scope: TenantScope, email: string): Promise<string[]> {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex(scope);
  return index.photos.filter((p) => p.email === normalizedEmail).map((p) => p.id);
}

export async function findPhotoById(scope: TenantScope, id: string) {
  const index = await readIndex(scope);
  return index.photos.find((photo) => photo.id === id);
}

async function loadRemote(url: string, fallbackType: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch media (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || fallbackType;
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

export async function getMediaFile(
  scope: TenantScope,
  id: string,
  variant: "original" | "cutout" | "preview",
) {
  const record = await findPhotoById(scope, id);
  if (!record) return null;

  try {
    if (variant === "original") {
      if (record.originalUrl) {
        return loadRemote(record.originalUrl, record.originalContentType || "application/octet-stream");
      }
      if (record.originalPath) {
        const buffer = await readFile(record.originalPath);
        return { buffer, contentType: record.originalContentType };
      }
      if (record.cutoutUrl) {
        return loadRemote(record.cutoutUrl, record.cutoutContentType || "image/png");
      }
      if (record.cutoutPath) {
        const buffer = await readFile(record.cutoutPath);
        return { buffer, contentType: record.cutoutContentType };
      }
      return null;
    }

    if (variant === "preview") {
      if (record.previewUrl) {
        return loadRemote(record.previewUrl, record.cutoutContentType || "image/png");
      }
      const ensured = await ensureCutoutPreview(scope, record);
      if (ensured.previewPath && ensured.previewContentType) {
        const buffer = await readFile(ensured.previewPath);
        return { buffer, contentType: ensured.previewContentType };
      }
    }

    if (record.cutoutUrl) {
      return loadRemote(record.cutoutUrl, record.cutoutContentType || "image/png");
    }
    if (record.cutoutPath) {
      const buffer = await readFile(record.cutoutPath);
      return { buffer, contentType: record.cutoutContentType };
    }
    return null;
  } catch (error) {
    console.error("Failed to load media", { id, variant, error });
    return null;
  }
}

export async function removePhotos(scope: TenantScope, ids: string[]) {
  if (ids.length === 0) return;
  const index = await readIndex(scope);
  const remaining = index.photos.filter((photo) => !ids.includes(photo.id));
  const removed = index.photos.filter((photo) => ids.includes(photo.id));

  for (const photo of removed) {
    const dir = photoDir(scope, photo.id);
    await rm(dir, { recursive: true, force: true });
  }

  await writeIndex({ photos: remaining }, scope);
}

export async function resetAllForEmail(scope: TenantScope, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex(scope);
  const remaining = index.photos.filter(
    (photo) => photo.email !== normalizedEmail,
  );
  const removed = index.photos.filter(
    (photo) => photo.email === normalizedEmail,
  );

  for (const photo of removed) {
    const dir = photoDir(scope, photo.id);
    await rm(dir, { recursive: true, force: true });
  }

  await writeIndex({ photos: remaining }, scope);
}
