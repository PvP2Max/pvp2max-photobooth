"use client";

import { useMemo, useState } from "react";

type Plan = {
  id: "free" | "limited" | "basic" | "pro";
  label: string;
  cost: number;
  details: string;
};

const plans: Plan[] = [
  {
    id: "free",
    label: "Free — $0",
    cost: 0,
    details: "50 photos, no AI removal, no custom backgrounds",
  },
  {
    id: "limited",
    label: "Limited — $10",
    cost: 10,
    details: "100 photos, AI removal on default backgrounds",
  },
  {
    id: "basic",
    label: "Basic — $20",
    cost: 20,
    details: "Unlimited photos, AI removal on default backgrounds",
  },
  {
    id: "pro",
    label: "Pro — $30",
    cost: 30,
    details: "Unlimited photos, AI removal on default + custom backgrounds",
  },
];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function SavingsCalculator() {
  const [rentalCost, setRentalCost] = useState("650");
  const [events, setEvents] = useState("3");
  const [gearCost, setGearCost] = useState("200");
  const [planId, setPlanId] = useState<Plan["id"]>("basic");

  const parsed = useMemo(() => {
    const rental = Number(rentalCost);
    const eventCount = Number(events);
    const gear = Number(gearCost);
    return { rental, eventCount, gear };
  }, [rentalCost, events, gearCost]);

  const results = useMemo(() => {
    const plan = plans.find((p) => p.id === planId) ?? plans[0];
    const errorsNext: { rental?: string; events?: string; gear?: string } = {};

    if (Number.isNaN(parsed.rental) || parsed.rental < 0) {
      errorsNext.rental = "Enter a valid rental cost (0 or more).";
    }
    if (!Number.isFinite(parsed.eventCount) || parsed.eventCount <= 0) {
      errorsNext.events = "Events must be at least 1.";
    }
    if (Number.isNaN(parsed.gear) || parsed.gear < 0) {
      errorsNext.gear = "Enter a valid gear cost (0 or more).";
    }

    const rentalTotal = parsed.rental * parsed.eventCount;
    const boothosTotal = parsed.gear + plan.cost * parsed.eventCount;
    const savings = rentalTotal - boothosTotal;
    const savingsPercent = rentalTotal > 0 ? (savings / rentalTotal) * 100 : 0;

    return {
      plan,
      errorsNext,
      rentalTotal,
      boothosTotal,
      savings,
      savingsPercent,
    };
  }, [parsed, planId]);

  function hasErrors() {
    return Object.keys(results.errorsNext).length > 0;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
      <form className="grid gap-4 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]">
        <div className="grid gap-2">
          <label htmlFor="rentalCost" className="text-sm font-semibold text-[var(--color-text)]">
            Average rental cost per event ($)
          </label>
          <input
            id="rentalCost"
            type="number"
            min="0"
            step="10"
            value={rentalCost}
            onChange={(e) => setRentalCost(e.target.value)}
            className="rounded-xl bg-[var(--color-bg-subtle)] px-3 py-2 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] focus:outline-none focus:ring-[var(--color-accent)]"
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            Typical US photo booth rental is $400–$1,000 per event. Adjust for your area.
          </p>
          {results.errorsNext.rental && <p className="text-xs text-[var(--color-danger)]">{results.errorsNext.rental}</p>}
        </div>

        <div className="grid gap-2">
          <label htmlFor="events" className="text-sm font-semibold text-[var(--color-text)]">
            Number of events
          </label>
          <input
            id="events"
            type="number"
            min="1"
            value={events}
            onChange={(e) => setEvents(e.target.value)}
            className="rounded-xl bg-[var(--color-bg-subtle)] px-3 py-2 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] focus:outline-none focus:ring-[var(--color-accent)]"
          />
          {results.errorsNext.events && <p className="text-xs text-[var(--color-danger)]">{results.errorsNext.events}</p>}
        </div>

        <div className="grid gap-2">
          <label htmlFor="plan" className="text-sm font-semibold text-[var(--color-text)]">
            BoothOS plan
          </label>
          <select
            id="plan"
            value={planId}
            onChange={(e) => setPlanId(e.target.value as Plan["id"])}
            className="rounded-xl bg-[var(--color-bg-subtle)] px-3 py-2 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] focus:outline-none focus:ring-[var(--color-accent)]"
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.label} — {plan.details}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label htmlFor="gear" className="text-sm font-semibold text-[var(--color-text)]">
            One-time gear cost ($)
          </label>
          <input
            id="gear"
            type="number"
            min="0"
            step="10"
            value={gearCost}
            onChange={(e) => setGearCost(e.target.value)}
            className="rounded-xl bg-[var(--color-bg-subtle)] px-3 py-2 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] focus:outline-none focus:ring-[var(--color-accent)]"
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            Tripod + ring light combo and optional backdrop. You can edit this.
          </p>
          {results.errorsNext.gear && <p className="text-xs text-[var(--color-danger)]">{results.errorsNext.gear}</p>}
        </div>

        <button
          type="button"
          className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-[var(--gradient-brand)] px-4 py-3 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
          disabled={hasErrors()}
        >
          {hasErrors() ? "Fix inputs to calculate" : "Calculate Savings"}
        </button>
      </form>

      <div className="grid gap-4 rounded-2xl bg-[var(--color-surface-elevated)] p-5 ring-1 ring-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Results</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Live savings estimate based on your entries.
            </p>
          </div>
          <span className="rounded-full bg-[rgba(34,197,94,0.16)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]">
            {plans.find((p) => p.id === planId)?.label ?? "Plan"}
          </span>
        </div>

        <div className="divide-y divide-[var(--color-border-subtle)] rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border-subtle)]">
          <ResultRow label="Total cost if you rent a booth" value={results.rentalTotal} />
          <ResultRow label="Total cost using BoothOS" value={results.boothosTotal} />
          <ResultRow label="Total savings" value={results.savings} highlight />
          <ResultRow
            label="You save"
            value={`${(results.savingsPercent || 0).toFixed(1)}%`}
            highlight
            isPercent
          />
        </div>

        {results.savings < 0 && !hasErrors() && (
          <div className="rounded-xl bg-[var(--color-warning-soft)] px-4 py-3 text-sm text-[var(--color-text)] ring-1 ring-[rgba(251,191,36,0.35)]">
            At these settings, renting is cheaper. Increase events or choose a different plan to see
            where BoothOS wins.
          </div>
        )}

        <p className="text-xs text-[var(--color-text-muted)]">
          Note: This calculator uses rough industry averages. Actual savings depend on your local rental
          prices and how many events you run.
        </p>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  highlight = false,
  isPercent = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  isPercent?: boolean;
}) {
  const display =
    typeof value === "number" && !isPercent ? currency.format(Number.isFinite(value) ? value : 0) : String(value);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span
        className={`text-base font-semibold ${highlight ? "text-[var(--color-success)]" : "text-[var(--color-text)]"}`}
      >
        {display}
      </span>
    </div>
  );
}
