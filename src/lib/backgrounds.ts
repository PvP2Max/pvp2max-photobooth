import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type BackgroundOption = {
  id: string;
  name: string;
  description: string;
  asset: string;
  isCustom?: boolean;
  createdAt?: string;
};

type BackgroundRecord = {
  id: string;
  name: string;
  description: string;
  filename: string;
  contentType: string;
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
  const custom: BackgroundOption[] = index.backgrounds.map((bg) => ({
    id: bg.id,
    name: bg.name,
    description: bg.description,
    asset: `/api/backgrounds/files/${bg.id}`,
    isCustom: true,
    createdAt: bg.createdAt,
  }));

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

  const record: BackgroundRecord = {
    id,
    name,
    description,
    filename,
    contentType,
    createdAt: new Date().toISOString(),
  };

  index.backgrounds.push(record);
  await writeIndex(index);

  return {
    id,
    name,
    description,
    asset: `/api/backgrounds/files/${id}`,
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
  };
}

export function builtInBackgrounds() {
  return BUILT_IN_BACKGROUNDS;
}

export async function getBackgroundName(id: string) {
  const all = await listBackgrounds();
  return all.find((bg) => bg.id === id)?.name ?? id;
}
