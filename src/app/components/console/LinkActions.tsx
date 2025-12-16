"use client";

export interface LinkActionsProps {
  label: string;
  url: string;
  copyKey: string;
  onCopy: (key: string, url: string) => void;
  onQr?: () => void;
  showQr?: boolean;
  copied?: boolean;
}

export function LinkActions({
  label,
  url,
  copyKey,
  onCopy,
  onQr,
  showQr = false,
  copied = false,
}: LinkActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--color-surface-elevated)] p-3 ring-1 ring-[var(--color-border-subtle)]">
      <div className="min-w-0 flex-1 text-sm font-semibold text-[var(--color-text)]">{label}</div>
      <button
        onClick={() => onCopy(copyKey, url)}
        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
          copied
            ? "bg-[var(--color-success-soft)] text-[var(--color-text)] ring-[rgba(34,197,94,0.5)]"
            : "bg-[var(--color-surface)] text-[var(--color-text)] ring-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]/80"
        }`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      {showQr && onQr && (
        <button
          onClick={onQr}
          className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]/80"
        >
          QR
        </button>
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-[var(--gradient-brand)] px-3 py-1 text-xs font-semibold text-[var(--color-text-on-primary)] shadow-[0_8px_20px_rgba(155,92,255,0.25)] transition hover:opacity-90"
      >
        Open
      </a>
    </div>
  );
}
