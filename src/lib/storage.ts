import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type PhotoRecord = {
  id: string;
  email: string;
  originalName: string;
  originalPath: string;
  originalContentType: string;
  cutoutPath: string;
  cutoutContentType: string;
  createdAt: string;
};

export type PublicPhoto = {
  id: string;
  email: string;
  originalName: string;
  createdAt: string;
  originalUrl: string;
  cutoutUrl: string;
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

function normalizeEmail(email: string) {
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
  };
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

  const record: PhotoRecord = {
    id,
    email: normalizedEmail,
    originalName: (file as File).name || "upload",
    originalPath,
    originalContentType,
    cutoutPath,
    cutoutContentType,
    createdAt: new Date().toISOString(),
  };

  index.photos.push(record);
  await writeIndex(index);

  return toPublicPhoto(record);
}

export async function listPhotosByEmail(email: string): Promise<PublicPhoto[]> {
  const normalizedEmail = normalizeEmail(email);
  const index = await readIndex();
  return index.photos
    .filter((photo) => photo.email === normalizedEmail)
    .map(toPublicPhoto);
}

export async function findPhotoById(id: string) {
  const index = await readIndex();
  return index.photos.find((photo) => photo.id === id);
}

export async function getMediaFile(
  id: string,
  variant: "original" | "cutout",
) {
  const record = await findPhotoById(id);
  if (!record) return null;

  if (variant === "original") {
    return {
      path: record.originalPath,
      contentType: record.originalContentType,
    };
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
