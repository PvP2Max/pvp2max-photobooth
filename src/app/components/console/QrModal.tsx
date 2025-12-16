"use client";

export interface QrModalProps {
  qrData: string | null;
  qrLink: string | null;
  qrLabel: string | null;
  onClose: () => void;
}

export function QrModal({ qrData, qrLink, qrLabel, onClose }: QrModalProps) {
  if (!qrData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-[var(--color-surface)] p-6 text-center text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-text-soft)]">{qrLabel}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrData} alt="QR code" className="mx-auto h-48 w-48" />
        <p className="break-all text-xs text-[var(--color-text-muted)]">{qrLink}</p>
        <button
          onClick={onClose}
          className="w-full rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
