"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Please try again.
        </p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-block border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:border-gray-400"
          >
            Go Home
          </a>
        </div>
        {error.digest && (
          <p className="mt-4 text-sm text-gray-400">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
