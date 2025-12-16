import Link from "next/link";

type Plan = {
  name: string;
  price: string;
  tagline: string;
  bullets: string[];
  cta: string;
  highlight?: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0 / event",
    tagline: "Test the booth or run small events.",
    bullets: [
      "Up to 10 photos",
      "Self-service booth mode",
      "Basic overlays",
      "No AI features",
      "BoothOS watermark on photos",
    ],
    cta: "Start Free",
  },
  {
    name: "Basic",
    price: "$10 / event",
    tagline: "Perfect for small parties.",
    bullets: [
      "Up to 50 photos",
      "AI background removal",
      "Email delivery",
      "Host gallery with ZIP download",
      "No watermarks",
    ],
    cta: "Choose Basic",
  },
  {
    name: "Pro",
    price: "$20 / event",
    tagline: "Great for medium-sized events.",
    bullets: [
      "Up to 100 photos",
      "AI background removal",
      "Email & SMS delivery",
      "Host gallery with ZIP download",
      "Premium filters",
    ],
    cta: "Choose Pro",
    highlight: true,
  },
  {
    name: "Unlimited",
    price: "$30 / event",
    tagline: "For hosts who want full control and AI features.",
    bullets: [
      "Unlimited photos",
      "AI background removal",
      "10 AI credits for backgrounds & filters",
      "Email & SMS delivery",
      "Host gallery with ZIP download",
    ],
    cta: "Choose Unlimited",
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">Plans & Pricing</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Run your own booth for less than the cost of renting a traditional photo booth.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex h-full flex-col gap-4 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)] ${plan.highlight ? "ring-2 ring-[var(--color-primary-soft)]" : ""}`}
          >
            {plan.highlight && (
              <span className="absolute right-4 top-4 rounded-full bg-[rgba(155,92,255,0.16)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text)] ring-1 ring-[rgba(155,92,255,0.35)]">
                Most Popular
              </span>
            )}
            <div className="space-y-1">
              <p className="text-lg font-semibold text-[var(--color-text)]">{plan.name}</p>
              <p className="text-sm text-[var(--color-primary-soft)]">{plan.price}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{plan.tagline}</p>
            </div>
            <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
              {plan.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/get-started"
              className={`mt-auto inline-flex w-fit items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${plan.highlight ? "bg-[var(--gradient-brand)] text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] hover:opacity-90" : "bg-[var(--color-surface-elevated)] text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]"}`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="space-y-6 rounded-3xl bg-[var(--color-surface-elevated)] p-6 ring-1 ring-[var(--color-border-subtle)]">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Photographer Plans</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Offer on-site selection and instant delivery as part of your photo packages.
            Perfect for professional photographers and event businesses.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-[var(--color-text)]">Photographer Event</p>
              <p className="text-sm text-[var(--color-primary-soft)]">$100 / event</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                One-time event purchase with full features.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span>Unlimited photos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span>10 AI credits (backgrounds & filters)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span>Add collaborators to event</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span>Photographer mode with guest selection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span>Email & SMS delivery</span>
              </li>
            </ul>
            <Link
              href="/get-started"
              className="mt-auto inline-flex w-fit items-center justify-center rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]"
            >
              Choose Event Plan
            </Link>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-[var(--color-text)]">Photographer Subscription</p>
              <p className="text-sm text-[var(--color-primary-soft)]">$250 / month</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Monthly subscription for unlimited events.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span>Unlimited events per month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span>10 AI credits/month (shared across events)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span>Add collaborators to events</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span>Photographer mode with guest selection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span>Email & SMS delivery</span>
              </li>
            </ul>
            <Link
              href="/get-started"
              className="mt-auto inline-flex w-fit items-center justify-center rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]"
            >
              Choose Subscription
            </Link>
          </div>
        </div>

        <p className="text-sm text-[var(--color-text-muted)]">
          Most traditional photo booth rentals cost between $400 and $1,000 per event. With BoothOS,
          you only pay per event or get unlimited events with a monthly subscription.
        </p>
      </div>
    </div>
  );
}
