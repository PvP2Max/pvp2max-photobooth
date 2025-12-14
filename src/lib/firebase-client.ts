import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

let app: FirebaseApp | null = null;

export function getFirebaseClient() {
  if (typeof window === "undefined") {
    throw new Error("Firebase client is only available in the browser");
  }
  if (!app) {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!apiKey || !authDomain || !projectId || !appId || !messagingSenderId || !storageBucket) {
      throw new Error("Missing Firebase client config env vars");
    }

    if (getApps().length === 0) {
      app = initializeApp({
        apiKey,
        authDomain,
        projectId,
        appId,
        messagingSenderId,
        storageBucket,
      });
      // Keep sessions around (e.g., 14-day local persistence).
      const auth = getAuth(app);
      void setPersistence(auth, browserLocalPersistence).catch(() => {});
    }
  }
  return { app: app!, auth: getAuth(app!) };
}
