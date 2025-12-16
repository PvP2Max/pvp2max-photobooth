"use client";

import { ReactNode } from "react";

type AlertProps = {
  type: "success" | "error" | "info" | "warning";
  message: string | ReactNode;
  onDismiss?: () => void;
  className?: string;
};

export default function Alert({ type, message, onDismiss, className = "" }: AlertProps) {
  const typeClasses = {
    success: "bg-[var(--color-success-soft)] text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]",
    error: "bg-[var(--color-danger-soft)] text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)]",
    info: "bg-[rgba(34,211,238,0.1)] text-[var(--color-text)] ring-1 ring-[rgba(34,211,238,0.35)]",
    warning: "bg-[rgba(251,191,36,0.1)] text-[var(--color-text)] ring-1 ring-[rgba(251,191,36,0.35)]",
  };

  return (
    <div className={`rounded-2xl px-4 py-3 text-sm ring-1 ${typeClasses[type]} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">{message}</div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-[var(--color-text-muted)] underline hover:text-[var(--color-text)]"
            type="button"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
