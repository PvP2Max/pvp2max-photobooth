import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let initialized = false;

export function getFirebaseAdmin() {
  if (!initialized && getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    try {
      if (projectId && clientEmail && privateKey) {
        const serviceAccount: ServiceAccount = {
          projectId,
          clientEmail,
          privateKey,
        };
        initializeApp({ credential: cert(serviceAccount) });
      } else if (serviceAccountJson) {
        const parsed = JSON.parse(serviceAccountJson) as ServiceAccount;
        initializeApp({ credential: cert(parsed) });
      } else {
        // Fall back to ADC / GOOGLE_APPLICATION_CREDENTIALS so Docker users can mount the file.
        initializeApp({ credential: applicationDefault() });
      }
    } catch (err) {
      console.error("Firebase admin initialization failed:", err);
      throw new Error(
        "Firebase credentials are not fully configured. Provide FIREBASE_* vars or GOOGLE_APPLICATION_CREDENTIALS/FIREBASE_SERVICE_ACCOUNT_JSON.",
      );
    }
    // Avoid failures on undefined fields like overlayLogo.
    getFirestore().settings({ ignoreUndefinedProperties: true });
  }
  initialized = true;
  return { auth: getAuth(), firestore: getFirestore() };
}
