import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type BackgroundOption = {
  id: string;
  name: string;
  description: string;
  asset: string;
  previewAsset?: string;
  isCustom?: boolean;
  createdAt?: string;
};

type BackgroundRecord = {
  id: string;
  name: string;
  description: string;
  filename: string;
  contentType: string;
  previewFilename?: string;
  previewContentType?: string;
  createdAt: string;
};

type BackgroundIndex = {
  backgrounds: BackgroundRecord[];
};

const BUILT_IN_BACKGROUNDS: BackgroundOption[] = [
];

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const BACKGROUND_DIR = path.join(STORAGE_ROOT, "backgrounds");
const FILE_DIR = path.join(BACKGROUND_DIR, "files");
const INDEX_FILE = path.join(BACKGROUND_DIR, "backgrounds.json");

function extensionFor(contentType: string, fallback = ".png") {
  if (contentType.includes("svg")) return ".svg";
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return fallback;
}

async function ensureBackgroundPreview(record: BackgroundRecord) {
  if (record.previewFilename) {
    try {
      await stat(path.join(FILE_DIR, record.previewFilename));
      return record;
    } catch {
      // fall through and regenerate
    }
  }
  try {
    const previewFilename = `preview-${record.id}.webp`;
    const target = path.join(FILE_DIR, previewFilename);
    await sharp(path.join(FILE_DIR, record.filename))
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(target);
    record.previewFilename = previewFilename;
    record.previewContentType = "image/webp";
    const index = await readIndex();
    const idx = index.backgrounds.findIndex((bg) => bg.id === record.id);
    if (idx >= 0) {
      index.backgrounds[idx].previewFilename = previewFilename;
      index.backgrounds[idx].previewContentType = "image/webp";
      await writeIndex(index);
    }
  } catch (error) {
    console.error("Failed to generate background preview", { id: record.id, error });
  }
  return record;
}

async function ensureBackgroundStorage() {
  await mkdir(FILE_DIR, { recursive: true });
  try {
    await readFile(INDEX_FILE, "utf8");
  } catch {
    const seed: BackgroundIndex = { backgrounds: [] };
    await writeFile(INDEX_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readIndex(): Promise<BackgroundIndex> {
  await ensureBackgroundStorage();
  try {
    const raw = await readFile(INDEX_FILE, "utf8");
    return JSON.parse(raw) as BackgroundIndex;
  } catch (error) {
    console.error("Failed to read background index", error);
    return { backgrounds: [] };
  }
}

async function writeIndex(index: BackgroundIndex) {
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), "utf8");
}

export async function listBackgrounds(): Promise<BackgroundOption[]> {
  const index = await readIndex();
  const custom: BackgroundOption[] = await Promise.all(
    index.backgrounds.map(async (bg) => {
      const ensured = await ensureBackgroundPreview(bg);
      return {
        id: ensured.id,
        name: ensured.name,
        description: ensured.description,
        asset: `/api/backgrounds/files/${ensured.id}`,
        previewAsset: `/api/backgrounds/files/${ensured.id}?preview=1`,
        isCustom: true,
        createdAt: ensured.createdAt,
      };
    }),
  );

  return [...BUILT_IN_BACKGROUNDS, ...custom];
}

export async function addBackground({
  name,
  description,
  file,
}: {
  name: string;
  description: string;
  file: File;
}): Promise<BackgroundOption> {
  const index = await readIndex();
  const id = randomUUID();
  const contentType = (file as Blob).type || "application/octet-stream";
  const ext = extensionFor(contentType);
  const filename = `${id}${ext}`;
  const target = path.join(FILE_DIR, filename);

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(target, Buffer.from(arrayBuffer));
  let previewFilename: string | undefined;
  let previewContentType: string | undefined;
  try {
    previewFilename = `preview-${id}.webp`;
    const previewTarget = path.join(FILE_DIR, previewFilename);
    await sharp(target)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(previewTarget);
    previewContentType = "image/webp";
  } catch (error) {
    console.error("Failed to generate background preview", { id, error });
  }

  const record: BackgroundRecord = {
    id,
    name,
    description,
    filename,
    contentType,
    previewFilename,
    previewContentType,
    createdAt: new Date().toISOString(),
  };

  index.backgrounds.push(record);
  await writeIndex(index);

  return {
    id,
    name,
    description,
    asset: `/api/backgrounds/files/${id}`,
    previewAsset: `/api/backgrounds/files/${id}?preview=1`,
    isCustom: true,
    createdAt: record.createdAt,
  };
}

export async function removeBackground(id: string) {
  const index = await readIndex();
  const record = index.backgrounds.find((bg) => bg.id === id);
  if (!record) {
    throw new Error("Background not found or not removable");
  }

  const filePath = path.join(FILE_DIR, record.filename);
  await rm(filePath, { force: true });
  const remaining = index.backgrounds.filter((bg) => bg.id !== id);
  await writeIndex({ backgrounds: remaining });
}

export async function findBackgroundAsset(id: string) {
  const index = await readIndex();
  const record = index.backgrounds.find((bg) => bg.id === id);
  if (!record) return null;
  return {
    path: path.join(FILE_DIR, record.filename),
    contentType: record.contentType,
    previewPath: record.previewFilename
      ? path.join(FILE_DIR, record.previewFilename)
      : undefined,
    previewContentType: record.previewContentType,
  };
}

export function builtInBackgrounds() {
  return BUILT_IN_BACKGROUNDS;
}

export async function getBackgroundName(id: string) {
  const all = await listBackgrounds();
  return all.find((bg) => bg.id === id)?.name ?? id;
}
