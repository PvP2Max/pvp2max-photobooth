import { randomUUID } from "node:crypto";
import { getFirebaseAdmin } from "./firebase";
import { TenantScope } from "./tenants";

type Notification = {
  id: string;
  email: string;
  count: number;
  createdAt: string;
};

function getFirestoreDb() {
  const { firestore } = getFirebaseAdmin();
  return firestore;
}

function notificationsCollection(scope: TenantScope) {
  return getFirestoreDb()
    .collection("users")
    .doc(scope.ownerUid)
    .collection("events")
    .doc(scope.eventId)
    .collection("notifications");
}

export async function addNotification(scope: TenantScope, email: string, count: number): Promise<void> {
  const notification: Notification = {
    id: randomUUID(),
    email,
    count,
    createdAt: new Date().toISOString(),
  };

  await notificationsCollection(scope).doc(notification.id).set(notification);
}

export async function popNotifications(scope: TenantScope): Promise<Notification[]> {
  const collection = notificationsCollection(scope);
  const snapshot = await collection.get();

  const notifications = snapshot.docs.map((doc) => doc.data() as Notification);

  // Delete all notifications after reading
  if (snapshot.docs.length > 0) {
    const batch = getFirestoreDb().batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  return notifications;
}
