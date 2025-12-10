import Link from "next/link";

const benefits = [
  "Save hundreds vs traditional booth rentals",
  "Works with any modern iPad or smartphone",
  "AI background removal and custom overlays",
  "Guests get instant download links by email or text",
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="grid gap-10 overflow-hidden rounded-3xl bg-[var(--color-surface)] px-8 py-12 ring-1 ring-[var(--color-border-subtle)] lg:grid-cols-[1.25fr,1fr] lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(155,92,255,0.14)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text)] ring-1 ring-[rgba(155,92,255,0.35)]">
            AI-powered booth software
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Turn Any iPad Into a Smart Photo Booth
            </h1>
            <p className="text-lg text-[var(--color-text-muted)]">
              BoothOS is an AI-powered photo booth for events. Skip the $650 rental and run your own
              booth with just an iPad, a ring light, and our software.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/get-started"
                className="rounded-full bg-[var(--gradient-brand)] px-5 py-3 font-semibold text-[var(--color-text-on-primary)] shadow-[0_15px_40px_rgba(155,92,255,0.35)] transition hover:opacity-95"
              >
                Start Free Booth
              </Link>
              <Link
                href="#"
                className="rounded-full px-4 py-3 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
              >
                Watch 60-second demo
              </Link>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Free plan includes 50 photos. No credit card required.
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface-elevated)] p-4 text-sm text-[var(--color-text-muted)] ring-1 ring-[var(--color-border-subtle)]">
            BoothOS handles overlays, AI background removal, and instant delivery links so guests can
            grab their photos without waiting in a line for printouts.
          </div>
        </div>

        <div className="relative isolate rounded-3xl bg-[var(--color-bg-subtle)] p-6 ring-1 ring-[var(--color-border-subtle)]">
          <div className="absolute -right-8 top-6 h-40 w-40 rounded-full bg-[rgba(155,92,255,0.25)] blur-3xl" />
          <div className="absolute -left-6 bottom-4 h-32 w-32 rounded-full bg-[rgba(34,211,238,0.25)] blur-3xl" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--color-text)]">Live Booth Session</p>
              <span className="rounded-full bg-[rgba(34,197,94,0.18)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]">
                Background-free
              </span>
            </div>
            <div className="grid gap-3">
              {["Countdown + filters", "Email or text link delivery", "Auto cleanup after send"].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl bg-[var(--color-surface)] px-4 py-3 ring-1 ring-[var(--color-border-subtle)]"
                  >
                    <span className="text-sm text-[var(--color-text)]">{item}</span>
                    <span className="h-2 w-2 rounded-full bg-[var(--color-primary-soft)]" />
                  </div>
                ),
              )}
            </div>
            <div className="rounded-2xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">
                Trusted for
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Weddings, school dances, military balls, graduations, birthdays, and small business
                pop-ups.
              </p>
            </div>
          </div>
        </div>
      </section>

      <p className="text-center text-sm text-[var(--color-text-muted)]">
        Perfect for parties, weddings, school dances, military balls, and small business events.
      </p>

      <section className="space-y-6">
        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-semibold">Why BoothOS?</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Keep the booth experience guests love while you stay in control of costs, branding, and
            delivery.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {benefits.map((item) => (
            <div
              key={item}
              className="rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]"
            >
              <p className="text-base text-[var(--color-text)]">{item}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/how-it-works"
            className="rounded-full bg-[var(--color-surface)] px-4 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
          >
            See how it works
          </Link>
          <Link
            href="/pricing"
            className="rounded-full bg-[var(--gradient-brand)] px-4 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
          >
            View pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
