import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { TenantScope, scopedStorageRoot } from "./tenants";

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
  businessId?: string;
  eventId?: string;
};

type BackgroundIndex = {
  backgrounds: BackgroundRecord[];
};

const BUILT_IN_BACKGROUNDS: BackgroundOption[] = [
];

function backgroundPaths(scope: TenantScope) {
  const root = scopedStorageRoot(scope);
  const dir = path.join(root, "backgrounds");
  const fileDir = path.join(dir, "files");
  const index = path.join(dir, "backgrounds.json");
  return { dir, fileDir, index };
}

function extensionFor(contentType: string, fallback = ".png") {
  if (contentType.includes("svg")) return ".svg";
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return fallback;
}

async function ensureBackgroundPreview(scope: TenantScope, record: BackgroundRecord) {
  const { fileDir, index } = backgroundPaths(scope);
  if (record.previewFilename) {
    try {
      await stat(path.join(fileDir, record.previewFilename));
      return record;
    } catch {
      // fall through and regenerate
    }
  }
  try {
    const previewFilename = `preview-${record.id}.webp`;
    const target = path.join(fileDir, previewFilename);
    await sharp(path.join(fileDir, record.filename))
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(target);
    record.previewFilename = previewFilename;
    record.previewContentType = "image/webp";
    const currentIndex = await readIndex(scope);
    const idx = index.backgrounds.findIndex((bg) => bg.id === record.id);
    if (idx >= 0) {
      currentIndex.backgrounds[idx].previewFilename = previewFilename;
      currentIndex.backgrounds[idx].previewContentType = "image/webp";
      await writeIndex(currentIndex, scope);
    }
  } catch (error) {
    console.error("Failed to generate background preview", { id: record.id, error });
  }
  return record;
}

async function ensureBackgroundStorage(scope: TenantScope) {
  const { fileDir, index } = backgroundPaths(scope);
  await mkdir(fileDir, { recursive: true });
  try {
    await readFile(index, "utf8");
  } catch {
    const seed: BackgroundIndex = { backgrounds: [] };
    await writeFile(index, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readIndex(scope: TenantScope): Promise<BackgroundIndex> {
  await ensureBackgroundStorage(scope);
  const { index } = backgroundPaths(scope);
  try {
    const raw = await readFile(index, "utf8");
    return JSON.parse(raw) as BackgroundIndex;
  } catch (error) {
    console.error("Failed to read background index", error);
    return { backgrounds: [] };
  }
}

async function writeIndex(index: BackgroundIndex, scope: TenantScope) {
  const { index: indexFile } = backgroundPaths(scope);
  await writeFile(indexFile, JSON.stringify(index, null, 2), "utf8");
}

export async function listBackgrounds(scope: TenantScope): Promise<BackgroundOption[]> {
  const index = await readIndex(scope);
  const custom: BackgroundOption[] = await Promise.all(
    index.backgrounds.map(async (bg) => {
      const ensured = await ensureBackgroundPreview(scope, bg);
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

export async function addBackground(
  scope: TenantScope,
  {
    name,
    description,
    file,
  }: {
    name: string;
    description: string;
    file: File;
  },
): Promise<BackgroundOption> {
  const index = await readIndex(scope);
  const { fileDir } = backgroundPaths(scope);
  const id = randomUUID();
  const contentType = (file as Blob).type || "application/octet-stream";
  const ext = extensionFor(contentType);
  const filename = `${id}${ext}`;
  const target = path.join(fileDir, filename);

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(target, Buffer.from(arrayBuffer));
  let previewFilename: string | undefined;
  let previewContentType: string | undefined;
  try {
    previewFilename = `preview-${id}.webp`;
    const previewTarget = path.join(fileDir, previewFilename);
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
    businessId: scope.businessId,
    eventId: scope.eventId,
  };

  index.backgrounds.push(record);
  await writeIndex(index, scope);

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

export async function removeBackground(scope: TenantScope, id: string) {
  const index = await readIndex(scope);
  const { fileDir } = backgroundPaths(scope);
  const record = index.backgrounds.find((bg) => bg.id === id);
  if (!record) {
    throw new Error("Background not found or not removable");
  }

  const filePath = path.join(fileDir, record.filename);
  await rm(filePath, { force: true });
  const remaining = index.backgrounds.filter((bg) => bg.id !== id);
  await writeIndex({ backgrounds: remaining }, scope);
}

export async function findBackgroundAsset(scope: TenantScope, id: string) {
  const index = await readIndex(scope);
  const { fileDir } = backgroundPaths(scope);
  const record = index.backgrounds.find((bg) => bg.id === id);
  if (!record) return null;
  return {
    path: path.join(fileDir, record.filename),
    contentType: record.contentType,
    previewPath: record.previewFilename
      ? path.join(fileDir, record.previewFilename)
      : undefined,
    previewContentType: record.previewContentType,
  };
}

export function builtInBackgrounds() {
  return BUILT_IN_BACKGROUNDS;
}

export async function getBackgroundName(scope: TenantScope, id: string) {
  const all = await listBackgrounds(scope);
  return all.find((bg) => bg.id === id)?.name ?? id;
}
