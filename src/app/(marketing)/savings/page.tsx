import Link from "next/link";

export default function SavingsPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">BoothOS vs Traditional Photo Booth Rentals</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Most events pay $650 or more to rent a photo booth for a few hours. BoothOS lets you keep
          the fun and lose the rental fee.
        </p>
      </div>

      <div className="space-y-4 rounded-3xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)]">
        <p className="text-sm text-[var(--color-text-muted)]">
          Typical rental cost ≈ $650 per event. BoothOS per-event plans: Free, $10, $20, $30. One-time
          gear cost ≈ $200 for tripod + ring light + optional backdrop.
        </p>
        <div className="space-y-4 rounded-2xl bg-[var(--color-surface-elevated)] p-5 ring-1 ring-[var(--color-border-subtle)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Estimate Your Savings</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Compare your local rental prices against BoothOS plans and your one-time gear cost.
              </p>
            </div>
            <Link
              href="#"
              className="inline-flex w-fit items-center justify-center rounded-full bg-[var(--gradient-brand)] px-4 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
            >
              Open Savings Calculator
            </Link>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-8 text-center text-sm text-[var(--color-text-soft)]">
            Calculator placeholder – add inputs for rental price, number of events, and your plan to
            visualize total savings.
          </div>
        </div>
      </div>
    </div>
  );
}
