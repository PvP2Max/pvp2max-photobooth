import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "./firebase";
import { uploadToR2, fetchFromR2, deleteFromR2 } from "./r2";
import { TenantScope } from "./tenants";

const R2_PREFIX = (process.env.R2_KEY_PREFIX || "boothos").replace(/\/+$/, "");
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

export type PhotoRecord = {
  id: string;
  email: string;
  originalName: string;
  originalContentType: string;
  cutoutContentType: string;
  createdAt: string;
  // R2 storage keys and URLs
  r2Key?: string;
  compositeUrl?: string;
  // Legacy fields (for backwards compat during transition)
  originalUrl?: string;
  cutoutUrl?: string;
  previewUrl?: string;
  // Scope fields
  ownerUid?: string;
  eventId?: string;
  mode?: "self-serve" | "photographer";
  overlayPack?: string;
  filterUsed?: string;
  backgroundId?: string;
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

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getFirestoreDb() {
  const { firestore } = getFirebaseAdmin();
  return firestore;
}

function photosCollection(scope: TenantScope) {
  return getFirestoreDb()
    .collection("users")
    .doc(scope.ownerUid)
    .collection("events")
    .doc(scope.eventId)
    .collection("photos");
}

function toPublicPhoto(record: PhotoRecord): PublicPhoto {
  // Use cutout URL - the final composite is only created when user selects background and sends
  const url = record.cutoutUrl || `/api/media/${record.id}/cutout`;

  return {
    id: record.id,
    email: record.email,
    originalName: record.originalName,
    createdAt: record.createdAt,
    originalUrl: url,
    cutoutUrl: url,
    previewUrl: url,
  };
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
  backgroundId,
}: {
  email: string;
  file: File;
  cutoutUrl: string;
  cutoutContentType: string;
  scope: TenantScope;
  overlayPack?: string;
  filterUsed?: string;
  mode?: "self-serve" | "photographer";
  backgroundId?: string;
}): Promise<PublicPhoto> {
  const normalizedEmail = normalizeEmail(email);
  const id = randomUUID();
  const originalContentType = (file as Blob).type || "application/octet-stream";

  // Fetch the cutout from MODNet's temporary URL (expires after ~1 day)
  // We save it to our R2 immediately to ensure it's available when user selects background
  console.log(`[storage] Fetching cutout from MODNet: ${cutoutUrl}`);
  const cutoutResponse = await fetch(cutoutUrl);
  if (!cutoutResponse.ok) {
    throw new Error(`Failed to fetch cutout from MODNet (${cutoutResponse.status})`);
  }
  const cutoutBuffer = Buffer.from(await cutoutResponse.arrayBuffer());

  // Save cutout to temporary R2 path (NOT production - composite is created later in /api/email)
  // This cutout is deleted after the composite is created and sent
  const r2Key = `${R2_PREFIX}/cutouts/${scope.ownerUid}/${scope.eventId}/${id}.png`;
  console.log(`[storage] Uploading cutout to R2: ${r2Key}`);

  const { url: cutoutPublicUrl } = await uploadToR2({
    key: r2Key,
    body: cutoutBuffer,
    contentType: "image/png",
    cacheControl: "public, max-age=86400", // 1 day (temporary until composite is created)
  });

  const publicUrl = cutoutPublicUrl || (R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${r2Key}` : undefined);

  const record: PhotoRecord = {
    id,
    email: normalizedEmail,
    originalName: (file as File).name || "upload",
    originalContentType,
    cutoutContentType,
    createdAt: new Date().toISOString(),
    r2Key,
    // This is the cutout URL, not the final composite (composite is created in /api/email)
    cutoutUrl: publicUrl,
    ownerUid: scope.ownerUid,
    eventId: scope.eventId,
    overlayPack,
    filterUsed,
    mode,
    backgroundId,
  };

  // Save to Firestore
  await photosCollection(scope).doc(id).set(record);
  console.log(`[storage] Photo saved to Firestore: users/${scope.ownerUid}/events/${scope.eventId}/photos/${id}`);

  return toPublicPhoto(record);
}

export async function listPhotosByEmail(
  scope: TenantScope,
  email: string,
): Promise<PublicPhoto[]> {
  const normalizedEmail = normalizeEmail(email);
  const snapshot = await photosCollection(scope)
    .where("email", "==", normalizedEmail)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => toPublicPhoto(doc.data() as PhotoRecord));
}

export async function listPhotoIdsByEmail(scope: TenantScope, email: string): Promise<string[]> {
  const normalizedEmail = normalizeEmail(email);
  const snapshot = await photosCollection(scope)
    .where("email", "==", normalizedEmail)
    .select("id")
    .get();

  return snapshot.docs.map((doc) => doc.id);
}

export async function listAllPhotos(scope: TenantScope): Promise<PhotoRecord[]> {
  const snapshot = await photosCollection(scope)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as PhotoRecord);
}

export async function findPhotoById(scope: TenantScope, id: string): Promise<PhotoRecord | undefined> {
  const doc = await photosCollection(scope).doc(id).get();
  if (!doc.exists) return undefined;
  return doc.data() as PhotoRecord;
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
    // Try R2 first (preferred for all variants now)
    if (record.r2Key) {
      try {
        const { buffer, contentType } = await fetchFromR2(record.r2Key);
        return { buffer, contentType };
      } catch (error) {
        console.warn(`[storage] Failed to fetch from R2, falling back to URL: ${error}`);
      }
    }

    // Fall back to composite URL or cutout URL
    const url = record.compositeUrl || record.cutoutUrl;
    if (url) {
      return loadRemote(url, record.cutoutContentType || "image/png");
    }

    return null;
  } catch (error) {
    console.error("Failed to load media", { id, variant, error });
    return null;
  }
}

export async function removePhotos(scope: TenantScope, ids: string[]) {
  if (ids.length === 0) return;

  const collection = photosCollection(scope);
  const r2Keys: string[] = [];

  // Get R2 keys for deletion
  for (const id of ids) {
    const doc = await collection.doc(id).get();
    if (doc.exists) {
      const data = doc.data() as PhotoRecord;
      if (data.r2Key) {
        r2Keys.push(data.r2Key);
      }
    }
  }

  // Delete from R2
  if (r2Keys.length > 0) {
    await deleteFromR2(r2Keys);
  }

  // Delete from Firestore
  const batch = getFirestoreDb().batch();
  for (const id of ids) {
    batch.delete(collection.doc(id));
  }
  await batch.commit();
}

export async function resetAllForEmail(scope: TenantScope, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const snapshot = await photosCollection(scope)
    .where("email", "==", normalizedEmail)
    .get();

  const ids = snapshot.docs.map((doc) => doc.id);
  if (ids.length > 0) {
    await removePhotos(scope, ids);
  }
}
