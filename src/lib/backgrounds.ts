import { randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { getFirebaseAdmin } from "./firebase";
import { uploadToR2, fetchFromR2, deleteFromR2 } from "./r2";
import { TenantScope } from "./tenants";

const R2_PREFIX = (process.env.R2_KEY_PREFIX || "boothos").replace(/\/+$/, "");
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

export type BackgroundOption = {
  id: string;
  name: string;
  description: string;
  asset: string;
  previewAsset?: string;
  isCustom?: boolean;
  createdAt?: string;
  allowed?: boolean;
  category?: "background" | "frame";
};

export type BackgroundRecord = {
  id: string;
  name: string;
  description: string;
  r2Key: string;
  url: string;
  previewR2Key?: string;
  previewUrl?: string;
  contentType: string;
  createdAt: string;
  ownerUid?: string;
  eventId?: string;
  category?: "background" | "frame";
};

function getFirestoreDb() {
  const { firestore } = getFirebaseAdmin();
  return firestore;
}

function backgroundsCollection(scope: TenantScope) {
  return getFirestoreDb()
    .collection("users")
    .doc(scope.ownerUid)
    .collection("events")
    .doc(scope.eventId)
    .collection("backgrounds");
}

async function loadBuiltInAssets(): Promise<BackgroundOption[]> {
  const assetsRoot = path.join(process.cwd(), "public", "assets");
  const groups: { dir: string; category: "background" | "frame" }[] = [
    { dir: path.join(assetsRoot, "default-backgrounds"), category: "background" },
    { dir: path.join(assetsRoot, "default-frames"), category: "frame" },
    // Fallback for user-provided defaults folder
    { dir: path.join(assetsRoot, "defaults", "backgrounds"), category: "background" },
    { dir: path.join(assetsRoot, "defaults", "frames"), category: "frame" },
  ];
  const options: BackgroundOption[] = [];
  for (const group of groups) {
    try {
      const files = await (await import("node:fs/promises")).readdir(group.dir);
      for (const file of files) {
        if (!/\.(png|jpg|jpeg|webp|svg)$/i.test(file)) continue;
        const id = `${group.category}-${file}`;
        options.push({
          id,
          name: file.replace(/\.[^.]+$/, ""),
          description: `Default ${group.category}`,
          asset: `/assets/${path.basename(group.dir)}/${file}`,
          previewAsset: `/assets/${path.basename(group.dir)}/${file}`,
          isCustom: false,
          category: group.category,
        });
      }
    } catch {
      // directory may not exist; ignore
    }
  }
  return options;
}

function extensionFor(contentType: string, fallback = ".png") {
  if (contentType.includes("svg")) return ".svg";
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return fallback;
}

export async function listBackgrounds(
  scope: TenantScope,
  allowedIds?: string[] | null,
): Promise<BackgroundOption[]> {
  const snapshot = await backgroundsCollection(scope).get();
  const builtIns = await loadBuiltInAssets();

  const custom: BackgroundOption[] = snapshot.docs.map((doc) => {
    const bg = doc.data() as BackgroundRecord;
    return {
      id: bg.id,
      name: bg.name,
      description: bg.description,
      asset: bg.url,
      previewAsset: bg.previewUrl || bg.url,
      isCustom: true,
      createdAt: bg.createdAt,
      category: bg.category ?? "background",
    };
  });

  const combined = [...builtIns, ...custom];
  if (Array.isArray(allowedIds)) {
    const allowedSet = new Set(allowedIds);
    return combined
      .filter((bg) => allowedSet.has(bg.id))
      .map((bg) => ({ ...bg, allowed: true }));
  }
  return combined.map((bg) => ({ ...bg, allowed: true }));
}

export async function addBackground(
  scope: TenantScope,
  {
    name,
    description,
    file,
    category = "background",
  }: {
    name: string;
    description: string;
    file: File;
    category?: "background" | "frame";
  },
): Promise<BackgroundOption> {
  const collection = backgroundsCollection(scope);
  const id = randomUUID();
  const contentType = (file as Blob).type || "application/octet-stream";
  const ext = extensionFor(contentType);

  // Read file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload main file to R2
  const r2Key = `${R2_PREFIX}/backgrounds/${scope.ownerUid}/${scope.eventId}/${id}${ext}`;
  const { url } = await uploadToR2({
    key: r2Key,
    body: buffer,
    contentType,
    cacheControl: "public, max-age=604800",
  });
  const publicUrl = url || (R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${r2Key}` : `/api/backgrounds/files/${id}`);

  // Generate and upload preview
  let previewR2Key: string | undefined;
  let previewUrl: string | undefined;
  try {
    const previewBuffer = await sharp(buffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    previewR2Key = `${R2_PREFIX}/backgrounds/${scope.ownerUid}/${scope.eventId}/preview-${id}.webp`;
    const { url: previewUploadUrl } = await uploadToR2({
      key: previewR2Key,
      body: previewBuffer,
      contentType: "image/webp",
      cacheControl: "public, max-age=604800",
    });
    previewUrl = previewUploadUrl || (R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${previewR2Key}` : `/api/backgrounds/files/${id}?preview=1`);
  } catch (error) {
    console.error("Failed to generate background preview", { id, error });
  }

  const record: BackgroundRecord = {
    id,
    name,
    description,
    r2Key,
    url: publicUrl,
    previewR2Key,
    previewUrl,
    contentType,
    createdAt: new Date().toISOString(),
    ownerUid: scope.ownerUid,
    eventId: scope.eventId,
    category,
  };

  await collection.doc(id).set(record);

  return {
    id,
    name,
    description,
    asset: publicUrl,
    previewAsset: previewUrl || publicUrl,
    isCustom: true,
    createdAt: record.createdAt,
    category,
  };
}

export async function removeBackground(scope: TenantScope, id: string): Promise<void> {
  const collection = backgroundsCollection(scope);
  const doc = await collection.doc(id).get();

  if (!doc.exists) {
    throw new Error("Background not found or not removable");
  }

  const data = doc.data() as BackgroundRecord;
  const keysToDelete = [data.r2Key];
  if (data.previewR2Key) {
    keysToDelete.push(data.previewR2Key);
  }

  await deleteFromR2(keysToDelete);
  await collection.doc(id).delete();
}

export async function findBackgroundById(scope: TenantScope, id: string): Promise<BackgroundRecord | undefined> {
  const doc = await backgroundsCollection(scope).doc(id).get();
  if (!doc.exists) return undefined;
  return doc.data() as BackgroundRecord;
}

export async function getBackgroundAsset(scope: TenantScope, id: string, preview = false) {
  const record = await findBackgroundById(scope, id);
  if (!record) return null;

  const key = preview && record.previewR2Key ? record.previewR2Key : record.r2Key;
  try {
    const { buffer, contentType } = await fetchFromR2(key);
    return { buffer, contentType };
  } catch (error) {
    console.error("Failed to fetch background from R2", { id, error });
    return null;
  }
}

export async function builtInBackgrounds(): Promise<BackgroundOption[]> {
  return loadBuiltInAssets();
}

export async function getBackgroundName(scope: TenantScope, id: string): Promise<string> {
  const all = await listBackgrounds(scope);
  return all.find((bg) => bg.id === id)?.name ?? id;
}
