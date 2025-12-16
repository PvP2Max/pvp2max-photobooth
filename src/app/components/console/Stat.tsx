"use client";

export interface StatProps {
  label: string;
  value: number;
}

export function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] p-3 ring-1 ring-[var(--color-border-subtle)]">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">{label}</p>
      <p className="text-2xl font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}
