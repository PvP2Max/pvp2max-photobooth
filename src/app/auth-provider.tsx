"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { getFirebaseClient } from "@/lib/firebase-client";

// Patches window.fetch to inject the current Firebase ID token in Authorization headers.
export default function AuthProvider() {
  useEffect(() => {
    const { auth } = getFirebaseClient();
    let currentToken: string | null = null;

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const maybeUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input instanceof Request
              ? input.url
              : "";

      // Only inject token for same-origin calls (our APIs). Avoid third-party hosts like Firebase.
      const isSameOrigin =
        maybeUrl.startsWith("/") ||
        (!!maybeUrl && maybeUrl.startsWith(window.location.origin));

      const headers = new Headers(init?.headers || {});

      if (!isSameOrigin) {
        // Prevent leaking our ID token to third parties; strip any Authorization.
        headers.delete("authorization");
        headers.delete("Authorization");
        return originalFetch(input, { ...init, headers });
      }

      const token = currentToken || (await auth.currentUser?.getIdToken?.());
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return originalFetch(input, { ...init, headers });
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentToken = await user.getIdToken();
      } else {
        currentToken = null;
      }
    });

    return () => {
      unsub();
    };
  }, []);

  return null;
}
