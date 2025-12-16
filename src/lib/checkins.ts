import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "./firebase";
import { normalizeEmail } from "./storage";
import { TenantScope } from "./tenants";

export type Checkin = {
  id: string;
  name: string;
  email: string;
  ownerUid?: string;
  eventId?: string;
  createdAt: string;
};

function getFirestoreDb() {
  const { firestore } = getFirebaseAdmin();
  return firestore;
}

function checkinsCollection(scope: TenantScope) {
  return getFirestoreDb()
    .collection("users")
    .doc(scope.ownerUid)
    .collection("events")
    .doc(scope.eventId)
    .collection("checkins");
}

export async function listCheckins(scope: TenantScope): Promise<Checkin[]> {
  const snapshot = await checkinsCollection(scope)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as Checkin);
}

export async function addCheckin(
  scope: TenantScope,
  {
    name,
    email,
  }: {
    name: string;
    email: string;
  },
): Promise<Checkin> {
  const normalizedEmail = normalizeEmail(email);
  const collection = checkinsCollection(scope);

  // Check for existing checkin with this email
  const existingSnapshot = await collection
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    // Update existing checkin
    const existingDoc = existingSnapshot.docs[0];
    const updated: Checkin = {
      ...existingDoc.data() as Checkin,
      name,
      createdAt: new Date().toISOString(),
      ownerUid: scope.ownerUid,
      eventId: scope.eventId,
    };
    await existingDoc.ref.update(updated);
    return updated;
  }

  // Create new checkin
  const checkin: Checkin = {
    id: randomUUID(),
    name,
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    ownerUid: scope.ownerUid,
    eventId: scope.eventId,
  };

  await collection.doc(checkin.id).set(checkin);
  return checkin;
}

export async function removeCheckinByEmail(scope: TenantScope, email: string): Promise<Checkin[]> {
  const normalizedEmail = normalizeEmail(email);
  const collection = checkinsCollection(scope);

  // Find and delete checkins with this email
  const snapshot = await collection
    .where("email", "==", normalizedEmail)
    .get();

  const batch = getFirestoreDb().batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();

  // Return remaining checkins
  return listCheckins(scope);
}
