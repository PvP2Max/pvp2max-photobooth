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
      "Up to 50 photos",
      "Self-service booth mode",
      "Basic overlays",
      "No AI background removal",
      "BoothOS branding on photos",
    ],
    cta: "Start Free",
  },
  {
    name: "Limited",
    price: "$10 / event",
    tagline: "Perfect for small parties.",
    bullets: [
      "Up to 100 photos",
      "AI background removal on default BoothOS backgrounds",
      "Email delivery",
      "Basic host gallery",
    ],
    cta: "Choose Limited",
  },
  {
    name: "Basic",
    price: "$20 / event",
    tagline: "Unlimited photos for busy events.",
    bullets: [
      "Unlimited photos",
      "AI background removal on default BoothOS backgrounds",
      "Email delivery",
      "Host gallery with ZIP download",
      "No watermarks on photos",
    ],
    cta: "Choose Basic",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$30 / event",
    tagline: "For hosts who want full control and custom branding.",
    bullets: [
      "Unlimited photos",
      "AI background removal on default or custom backgrounds",
      "Email & SMS delivery",
      "Custom overlays and branding",
      "Host gallery with ZIP download",
    ],
    cta: "Choose Pro",
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

      <div className="space-y-4 rounded-3xl bg-[var(--color-surface-elevated)] p-6 ring-1 ring-[var(--color-border-subtle)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Photographer Mode</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Offer on-site selection and instant delivery as part of your photo packages.
              Photographer Mode starts at $100 per event or $250 per month for unlimited events.
            </p>
          </div>
          <Link
            href="/photographers"
            className="inline-flex w-fit items-center justify-center rounded-full bg-[var(--color-surface)] px-4 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]/80"
          >
            Learn about Photographer Mode
          </Link>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          Most traditional photo booth rentals cost between $400 and $1,000 per event. With BoothOS,
          you only pay per event and a one-time gear cost.
        </p>
      </div>
    </div>
  );
}
