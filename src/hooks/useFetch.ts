import { useState, useCallback } from "react";

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useFetch<T = unknown>() {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (
    url: string,
    options?: RequestInit & { body?: unknown }
  ): Promise<T | null> => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        credentials: "include",
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || `Request failed (${res.status})`);
      }
      setState({ data: payload, loading: false, error: null });
      return payload;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setState({ data: null, loading: false, error: msg });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
