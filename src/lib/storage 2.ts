import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type PhotoRecord = {
  id: string;
  email: string;
  originalName: string;
  originalPath: string;
  originalContentType: string;
  cutoutPath: string;
  cutoutContentType: string;
  previewPath?: string;
  previewContentType?: string;
  createdAt: string;
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

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const PHOTO_DIR = path.join(STORAGE_ROOT, "photos");
const INDEX_FILE = path.join(STORAGE_ROOT, "photos.json");

type IndexFile = {
  photos: PhotoRecord[];
};

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function ensureStorage() {
  await mkdir(PHOTO_DIR, { recursive: true });
  try {
    await readFile(INDEX_FILE, "utf8");
  } catch {
    const seed: IndexFile = { photos: [] };
    await writeFile(INDEX_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readIndex(): Promise<IndexFile> {
  await ensureStorage();
  try {
    const raw = await readFile(INDEX_FILE, "utf8");
    return JSON.parse(raw) as IndexFile;
  } catch (error) {
    console.error("Failed to read storage index", error);
    return { photos: [] };
  }
}

async function writeIndex(index: IndexFile) {
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), "utf8");
}

function resolveExtension(contentType: string, fallback = ".png") {
  return EXTENSION_BY_TYPE[contentType] ?? fallback;
}

function photoDir(id: string) {
  return path.join(PHOTO_DIR, id);
}

function toPublicPhoto(record: PhotoRecord): PublicPhoto {
  return {
    id: record.id,
    email: record.email,
    originalName: record.originalName,
    createdAt: record.createdAt,
    originalUrl: `/api/media/${record.id}/original`,
    cutoutUrl: `/api/media/${record.id}/cutout`,
    previewUrl: `/api/media/${record.id}/preview`,
  };
}

async function ensureCutoutPreview(record: PhotoRecord) {
  if (record.previewPath) {
    try {
      await stat(record.previewPath);
      return record;
    } catch {
      // fall through and regenerate
    }
  }
  try {
    const previewPath = path.join(photoDir(record.id), "cutout-preview.webp");
    await sharp(record.cutoutPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(previewPath);
    record.previewPath = previewPath;
    record.previewContentType = "image/webp";
    const index = await readIndex();
    const idx = index.photos.findIndex((p) => p.id === record.id);
    if (idx >= 0) {
      index.photos[idx].previewPath = previewPath;
      index.photos[idx].previewContentType = "image/webp";
      await writeIndex(index);
    }
  } catch (error) {
    console.error("Failed to generate cutout preview", { id: record.id, error });
  }
  return record;
}

export async function savePhoto({
  email,
  file,
  cutout,
  cutoutContentType,
}: {
  email: string;
  file: File;
  cutout: Buffer;
  cutoutContentType: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex();

  const id = randomUUID();
  const dir = photoDir(id);
  await mkdir(dir, { recursive: true });

  const fileArrayBuffer = await file.arrayBuffer();
  const originalContentType =
    (file as Blob).type || "application/octet-stream";
  const originalExtension = resolveExtension(originalContentType, ".bin");
  const originalPath = path.join(dir, `original${originalExtension}`);
  await writeFile(originalPath, Buffer.from(fileArrayBuffer));

  const cutoutExtension = resolveExtension(cutoutContentType, ".png");
  const cutoutPath = path.join(dir, `cutout${cutoutExtension}`);
  await writeFile(cutoutPath, cutout);
  const previewPath = path.join(dir, "cutout-preview.webp");
  let previewContentType: string | undefined;
  try {
    await sharp(cutoutPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(previewPath);
    previewContentType = "image/webp";
  } catch (error) {
    console.error("Failed to create cutout preview", { email, error });
  }

  const record: PhotoRecord = {
    id,
    email: normalizedEmail,
    originalName: (file as File).name || "upload",
    originalPath,
    originalContentType,
    cutoutPath,
    cutoutContentType,
    previewPath: previewContentType ? previewPath : undefined,
    previewContentType,
    createdAt: new Date().toISOString(),
  };

  index.photos.push(record);
  await writeIndex(index);

  return toPublicPhoto(record);
}

export async function listPhotosByEmail(email: string): Promise<PublicPhoto[]> {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex();
  const filtered = index.photos.filter((photo) => photo.email === normalizedEmail);
  return Promise.all(
    filtered.map(async (photo) => toPublicPhoto(await ensureCutoutPreview(photo))),
  );
}

export async function listPhotoIdsByEmail(email: string): Promise<string[]> {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex();
  return index.photos.filter((p) => p.email === normalizedEmail).map((p) => p.id);
}

export async function findPhotoById(id: string) {
  const index = await readIndex();
  return index.photos.find((photo) => photo.id === id);
}

export async function getMediaFile(
  id: string,
  variant: "original" | "cutout" | "preview",
) {
  const record = await findPhotoById(id);
  if (!record) return null;

  if (variant === "original") {
    return {
      path: record.originalPath,
      contentType: record.originalContentType,
    };
  }

  if (variant === "preview") {
    const ensured = await ensureCutoutPreview(record);
    if (ensured.previewPath && ensured.previewContentType) {
      return {
        path: ensured.previewPath,
        contentType: ensured.previewContentType,
      };
    }
  }

  return {
    path: record.cutoutPath,
    contentType: record.cutoutContentType,
  };
}

export async function removePhotos(ids: string[]) {
  if (ids.length === 0) return;
  const index = await readIndex();
  const remaining = index.photos.filter((photo) => !ids.includes(photo.id));
  const removed = index.photos.filter((photo) => ids.includes(photo.id));

  for (const photo of removed) {
    const dir = photoDir(photo.id);
    await rm(dir, { recursive: true, force: true });
  }

  await writeIndex({ photos: remaining });
}

export async function resetAllForEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex();
  const remaining = index.photos.filter(
    (photo) => photo.email !== normalizedEmail,
  );
  const removed = index.photos.filter(
    (photo) => photo.email === normalizedEmail,
  );

  for (const photo of removed) {
    const dir = photoDir(photo.id);
    await rm(dir, { recursive: true, force: true });
  }

  await writeIndex({ photos: remaining });
}
