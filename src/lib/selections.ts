import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "./firebase";
import { TenantScope } from "./tenants";

export type SelectionToken = {
  token: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  ownerUid?: string;
  eventId?: string;
};

function getFirestoreDb() {
  const { firestore } = getFirebaseAdmin();
  return firestore;
}

function selectionsCollection(scope: TenantScope) {
  return getFirestoreDb()
    .collection("users")
    .doc(scope.ownerUid)
    .collection("events")
    .doc(scope.eventId)
    .collection("selections");
}

export async function createSelectionToken(scope: TenantScope, email: string, ttlHours = 72): Promise<SelectionToken> {
  const collection = selectionsCollection(scope);
  const now = Date.now();
  const expiresAt = new Date(now + ttlHours * 60 * 60 * 1000).toISOString();
  const token: SelectionToken = {
    token: randomUUID(),
    email,
    createdAt: new Date().toISOString(),
    expiresAt,
    ownerUid: scope.ownerUid,
    eventId: scope.eventId,
  };

  await collection.doc(token.token).set(token);
  return token;
}

export async function findSelectionToken(scope: TenantScope, token: string): Promise<SelectionToken | null> {
  const doc = await selectionsCollection(scope).doc(token).get();
  if (!doc.exists) return null;

  const found = doc.data() as SelectionToken;
  if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
    return null;
  }

  return found;
}

export async function markSelectionUsed(scope: TenantScope, token: string): Promise<void> {
  const docRef = selectionsCollection(scope).doc(token);
  const doc = await docRef.get();
  if (doc.exists) {
    await docRef.update({
      usedAt: new Date().toISOString(),
    });
  }
}
