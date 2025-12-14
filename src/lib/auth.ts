import { NextRequest } from "next/server";
import { getFirebaseAdmin } from "./firebase";
import { BoothEvent } from "./tenants";

export type AuthenticatedUser = {
  uid: string;
  email?: string;
};

export type EventAccess = {
  event: BoothEvent;
  businessId: string;
  businessSlug: string;
  businessName: string;
  roles: {
    owner: boolean;
    photographer: boolean;
    review: boolean;
  };
};

export async function verifyBearer(request: NextRequest): Promise<AuthenticatedUser | null> {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) return null;
  const token = match[1];
  const { auth } = getFirebaseAdmin();
  try {
    const decoded = await auth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

export function roleForEvent(event: BoothEvent, uid: string) {
  const photographer = event.roles?.photographer?.includes(uid) ?? false;
  const review = event.roles?.review?.includes(uid) ?? false;
  const owner = event.ownerUid === uid;
  return {
    owner,
    photographer: owner || photographer,
    review: owner || review,
  };
}
