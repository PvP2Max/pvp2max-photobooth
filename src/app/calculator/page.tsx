"use client";

import { useMemo, useState } from "react";

type Plan = {
  id: "free" | "limited" | "basic" | "pro";
  label: string;
  cost: number;
  details: string;
};

const plans: Plan[] = [
  { id: "free", label: "Free — $0", cost: 0, details: "50 photos, no AI removal, no custom backgrounds" },
  { id: "limited", label: "Limited — $10", cost: 10, details: "100 photos, AI removal on default backgrounds" },
  { id: "basic", label: "Basic — $20", cost: 20, details: "Unlimited photos, AI removal on default backgrounds" },
  { id: "pro", label: "Pro — $30", cost: 30, details: "Unlimited photos, AI removal on default + custom backgrounds" },
];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function CalculatorPage() {
  const [rentalCost, setRentalCost] = useState("650");
  const [events, setEvents] = useState("3");
  const [gearCost, setGearCost] = useState("200");
  const [planId, setPlanId] = useState<Plan["id"]>("basic");

  // Derived numeric values with basic parsing/NaN handling
  const parsed = useMemo(() => {
    const rental = Number(rentalCost);
    const eventCount = Number(events);
    const gear = Number(gearCost);
    return { rental, eventCount, gear };
  }, [rentalCost, events, gearCost]);

  // Main calculation encapsulated for reuse across submit/auto-calc
  const results = useMemo(() => {
    const plan = plans.find((p) => p.id === planId) ?? plans[0];
    const errorsNext: { rental?: string; events?: string; gear?: string } = {};

    // Validate numeric inputs and event count > 0
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // If there are validation errors, do not proceed
    if (Object.keys(results.errorsNext).length > 0) return;
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">BoothOS</p>
          <h1>BoothOS Savings Calculator</h1>
          <p className="subtitle">
            See how much you save by running your own booth with an iPad instead of renting a traditional photo booth.
          </p>
        </div>
      </header>

      <main className="container">
        <section className="card layout">
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="rentalCost">Average rental cost per event ($)</label>
              <input
                id="rentalCost"
                type="number"
                min="0"
                step="10"
                value={rentalCost}
                onChange={(e) => setRentalCost(e.target.value)}
              />
              <p className="helper">Typical US photo booth rental is $400–$1,000 per event. Adjust for your area.</p>
              {results.errorsNext.rental && <p className="error">{results.errorsNext.rental}</p>}
            </div>

            <div className="field">
              <label htmlFor="events">Number of events</label>
              <input
                id="events"
                type="number"
                min="1"
                value={events}
                onChange={(e) => setEvents(e.target.value)}
              />
              {results.errorsNext.events && <p className="error">{results.errorsNext.events}</p>}
            </div>

            <div className="field">
              <label htmlFor="plan">BoothOS plan</label>
              <select id="plan" value={planId} onChange={(e) => setPlanId(e.target.value as Plan["id"])}>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.label} — {plan.details}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="gear">One-time gear cost ($)</label>
              <input
                id="gear"
                type="number"
                min="0"
                step="10"
                value={gearCost}
                onChange={(e) => setGearCost(e.target.value)}
              />
              <p className="helper">Tripod + ring light combo and optional backdrop. You can edit this.</p>
              {results.errorsNext.gear && <p className="error">{results.errorsNext.gear}</p>}
            </div>

            <button className="btn" type="submit">
              Calculate Savings
            </button>
          </form>

          <div className="results">
            <h3>Results</h3>
            <div className="stat">
              <span className="label">Total cost if you RENT a booth:</span>
              <span className="value">{currency.format(results.rentalTotal || 0)}</span>
            </div>
            <div className="stat">
              <span className="label">Total cost using BoothOS:</span>
              <span className="value">{currency.format(results.boothosTotal || 0)}</span>
            </div>
            <div className="stat">
              <span className="label">Total savings:</span>
              <span className={`value ${results.savings >= 0 ? "positive" : ""}`}>
                {currency.format(results.savings || 0)}
              </span>
            </div>
            <div className="stat">
              <span className="label">You save:</span>
              <span className="value">{`${(results.savingsPercent || 0).toFixed(1)}%`}</span>
            </div>
            {results.savings < 0 && (
              <div className="warning">
                At these settings, renting is cheaper. Try increasing the number of events or choosing a different plan.
              </div>
            )}
          </div>
        </section>

        <p className="note">
          Note: This calculator uses rough industry averages and simple assumptions. Actual savings depend on your local rental
          prices and how many events you run.
        </p>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text);
        }
        .hero {
          background: var(--color-surface);
          color: var(--color-text);
          padding: 32px 16px;
          text-align: center;
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.24em;
          font-size: 0.8rem;
          color: var(--color-primary-soft);
          margin: 0 0 8px;
        }
        h1 {
          margin: 0;
          font-size: 2rem;
        }
        .subtitle {
          margin: 8px auto 0;
          max-width: 720px;
          color: var(--color-text-muted);
        }
        .container {
          max-width: 960px;
          margin: -36px auto 60px;
          padding: 0 16px;
        }
        .card {
          background: var(--color-surface);
          border-radius: 18px;
          box-shadow: var(--shadow-soft);
          border: 1px solid var(--color-border-subtle);
          padding: 24px;
        }
        .layout {
          display: grid;
          gap: 20px;
        }
        @media (min-width: 768px) {
          .layout {
            grid-template-columns: 1fr 1fr;
          }
        }
        .form {
          display: grid;
          gap: 14px;
        }
        label {
          font-weight: 700;
          margin-bottom: 6px;
          display: block;
        }
        input,
        select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--color-border-subtle);
          background: var(--color-bg);
          color: var(--color-text);
          font-size: 1rem;
        }
        .helper {
          font-size: 0.9rem;
          color: var(--color-text-muted);
          margin: 0;
        }
        .error {
          color: #b91c1c;
          font-size: 0.85rem;
          margin: 0;
        }
        .btn {
          margin-top: 6px;
          background: var(--gradient-brand);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 12px 14px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 12px 30px rgba(37, 99, 235, 0.28);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 34px rgba(37, 99, 235, 0.34);
        }
        .results {
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border-subtle);
          border-radius: 14px;
          padding: 16px;
        }
        .results h3 {
          margin: 0 0 12px;
          color: var(--color-text);
        }
        .stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .stat:last-child {
          border-bottom: none;
        }
        .label {
          color: var(--color-text-muted);
        }
        .value {
          font-weight: 700;
          font-size: 1.1rem;
        }
        .positive {
          color: var(--color-success);
          font-size: 1.2rem;
        }
        .warning {
          margin-top: 10px;
          padding: 10px 12px;
          background: var(--color-warning-soft);
          border: 1px solid rgba(251, 191, 36, 0.35);
          border-radius: 10px;
          color: var(--color-warning);
          font-size: 0.95rem;
        }
        .note {
          text-align: center;
          margin: 18px 0 4px;
          color: var(--color-text-muted);
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
