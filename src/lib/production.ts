import { randomUUID } from "node:crypto";
import archiver from "archiver";
import { getFirebaseAdmin } from "./firebase";
import { uploadToR2, fetchFromR2, deleteFromR2 } from "./r2";
import { TenantScope } from "./tenants";

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
  ownerUid?: string;
  eventId?: string;
  downloadCount?: number;
  lastDownloadedAt?: string;
  downloadEvents?: { at: string; ip?: string }[];
  bundleKey?: string;
  bundleUrl?: string | null;
  bundleFilename?: string;
};

function getFirestoreDb() {
  const { firestore } = getFirebaseAdmin();
  return firestore;
}

function productionsCollection(scope: TenantScope) {
  return getFirestoreDb()
    .collection("users")
    .doc(scope.ownerUid)
    .collection("events")
    .doc(scope.eventId)
    .collection("productions");
}

export async function saveProduction(
  scope: TenantScope,
  email: string,
  attachments: { filename: string; content: Buffer; contentType: string }[],
  ttlHours = 72,
): Promise<ProductionSet> {
  const collection = productionsCollection(scope);
  const id = randomUUID();
  const downloadToken = randomUUID();
  const tokenExpiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

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
    ownerUid: scope.ownerUid,
    eventId: scope.eventId,
    downloadCount: 0,
    downloadEvents: [],
    bundleKey,
    bundleUrl,
    bundleFilename,
  };

  await collection.doc(id).set(record);
  return record;
}

export async function listProduction(scope: TenantScope): Promise<ProductionSet[]> {
  await purgeExpiredProduction(scope);
  const snapshot = await productionsCollection(scope)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as ProductionSet);
}

export async function deleteProduction(scope: TenantScope, id: string): Promise<void> {
  const collection = productionsCollection(scope);
  const doc = await collection.doc(id).get();

  if (doc.exists) {
    const data = doc.data() as ProductionSet;
    const keys = [
      ...data.attachments.map((a) => a.r2Key).filter(Boolean),
      ...(data.bundleKey ? [data.bundleKey] : []),
    ];
    await deleteFromR2(keys);
    await collection.doc(id).delete();
  }
}

export async function deleteAllProduction(scope: TenantScope): Promise<void> {
  const snapshot = await productionsCollection(scope).get();
  const allKeys: string[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as ProductionSet;
    allKeys.push(
      ...data.attachments.map((a) => a.r2Key).filter(Boolean),
      ...(data.bundleKey ? [data.bundleKey] : []),
    );
  }

  await deleteFromR2(allKeys);

  const batch = getFirestoreDb().batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

export async function getProductionAttachment(scope: TenantScope, id: string, filename: string) {
  const doc = await productionsCollection(scope).doc(id).get();
  if (!doc.exists) return null;

  const item = doc.data() as ProductionSet;
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

  const blob = await fetchFromR2(attachment.r2Key);
  return {
    buffer: blob.buffer,
    contentType: blob.contentType || attachment.contentType,
    filename: attachment.filename,
  };
}

export async function findProductionById(scope: TenantScope, id: string): Promise<ProductionSet | undefined> {
  const doc = await productionsCollection(scope).doc(id).get();
  if (!doc.exists) return undefined;
  return doc.data() as ProductionSet;
}

export async function verifyProductionToken(scope: TenantScope, id: string, token: string): Promise<ProductionSet | null> {
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

export async function recordDownload(scope: TenantScope, id: string, ip?: string): Promise<void> {
  const docRef = productionsCollection(scope).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return;

  const record = doc.data() as ProductionSet;
  const at = new Date().toISOString();
  const history = record.downloadEvents ?? [];
  history.unshift({ at, ip });

  await docRef.update({
    downloadCount: (record.downloadCount ?? 0) + 1,
    lastDownloadedAt: at,
    downloadEvents: history.slice(0, 25),
  });
}

export async function purgeExpiredProduction(scope: TenantScope): Promise<void> {
  const now = Date.now();
  const snapshot = await productionsCollection(scope).get();
  const expired: ProductionSet[] = [];

  for (const doc of snapshot.docs) {
    const item = doc.data() as ProductionSet;
    const exp = new Date(item.tokenExpiresAt).getTime();
    if (exp && exp < now) {
      expired.push(item);
    }
  }

  if (expired.length > 0) {
    const allKeys: string[] = [];
    const batch = getFirestoreDb().batch();

    for (const item of expired) {
      allKeys.push(
        ...item.attachments.map((a) => a.r2Key).filter(Boolean),
        ...(item.bundleKey ? [item.bundleKey] : []),
      );
      batch.delete(productionsCollection(scope).doc(item.id));
    }

    await deleteFromR2(allKeys);
    await batch.commit();
  }
}

async function buildZip(files: { filename: string; content: Buffer }[]): Promise<Buffer> {
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
