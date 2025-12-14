import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let initialized = false;

export function getFirebaseAdmin() {
  if (!initialized && getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Firebase credentials are not fully configured");
    }

    const serviceAccount: ServiceAccount = {
      projectId,
      clientEmail,
      privateKey,
    };
    initializeApp({ credential: cert(serviceAccount) });
  }
  initialized = true;
  return { auth: getAuth() };
}
