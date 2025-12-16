import { NextRequest } from "next/server";
import { getFirebaseAdmin } from "./firebase";
import { BoothEvent, TenantScope } from "./tenants";

export type AuthenticatedUser = {
  uid: string;
  email?: string;
};

export type EventAccess = {
  event: BoothEvent;
  scope: TenantScope;
  roles: {
    owner: boolean;
    collaborator: boolean;  // Can upload photos AND send deliveries
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
  const owner = event.ownerUid === uid;
  // Check new collaborator role
  const collaborator = event.roles?.collaborator?.includes(uid) ?? false;
  // Also check legacy roles for backwards compatibility
  const legacyPhotographer = (event.roles as { photographer?: string[] })?.photographer?.includes(uid) ?? false;
  const legacyReview = (event.roles as { review?: string[] })?.review?.includes(uid) ?? false;

  return {
    owner,
    collaborator: owner || collaborator || legacyPhotographer || legacyReview,
  };
}
