import Link from "next/link";

const gear = [
  "iPad or modern smartphone",
  "Sturdy tripod or tablet stand",
  '12" bi-color LED ring light (dimmable, up to ~6 ft tall)',
  "Light gray wall or backdrop placed 2–3 feet behind guests",
];

const steps = [
  "Create your BoothOS account and choose an event plan.",
  "Mount your iPad on a tripod at about 5–5.3 feet eye level.",
  "Place your ring light just above and in front of the iPad, tilted slightly downward.",
  "Position your backdrop 2–3 feet behind where guests will stand.",
  "Open your event link in BoothOS, tap into booth mode, and run a quick test shot.",
];

export default function GetStartedPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">Get Started with BoothOS</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          You don’t need expensive hardware to run a great booth. Here’s what we recommend for a
          clean, reliable setup.
        </p>
      </div>

      <section className="space-y-4 rounded-3xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)]">
        <h2 className="text-2xl font-semibold">Recommended Gear</h2>
        <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
          {gear.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-3xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)]">
        <h2 className="text-2xl font-semibold">Basic Setup Steps</h2>
        <ol className="space-y-3 text-sm text-[var(--color-text-muted)]">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="mt-[2px] h-6 w-6 rounded-full bg-[var(--color-surface-elevated)] text-center text-xs font-semibold leading-6 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="rounded-3xl bg-[var(--color-surface-elevated)] p-6 ring-1 ring-[var(--color-border-subtle)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-[var(--color-text)]">
              Ready to host your first event?
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Set up your event, open booth mode, and you’re ready to welcome guests.
            </p>
          </div>
          <Link
            href="/app/dashboard"
            className="inline-flex w-fit items-center justify-center rounded-full bg-[var(--gradient-brand)] px-4 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
