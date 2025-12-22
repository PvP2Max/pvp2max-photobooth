"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseClient } from "@/lib/firebase-client";

type AuthState = {
  user: User | null;
  loading: boolean;
  ready: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  ready: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

// Patches window.fetch to inject the current Firebase ID token in Authorization headers.
export default function AuthProvider({ children }: { children?: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    ready: false,
  });

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

      // Try to get token - first from cache, then from current user
      const token = currentToken || (await auth.currentUser?.getIdToken?.());
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return originalFetch(input, { ...init, headers });
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentToken = await user.getIdToken();
        setAuthState({ user, loading: false, ready: true });
      } else {
        currentToken = null;
        setAuthState({ user: null, loading: false, ready: true });
      }
    });

    return () => {
      unsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}
