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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-soft)]">
            AI-powered booth software
          </p>
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
              {[
                "Background-free capture",
                "Countdown + filters",
                "Email or text link delivery",
                "Auto cleanup after send",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl bg-[var(--color-surface)] px-4 py-3 ring-1 ring-[var(--color-border-subtle)]"
                >
                  <span className="text-sm text-[var(--color-text)]">{item}</span>
                  <span className="h-2 w-2 rounded-full bg-[var(--color-primary-soft)]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <p className="text-center text-sm text-[var(--color-text-muted)]">
        Trusted for weddings, school dances, military balls, graduations, birthdays, and small business pop-ups.
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

      <section className="space-y-4 rounded-3xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)]">
        <h2 className="text-2xl font-semibold">Perfect for these kinds of events</h2>
        <div className="flex flex-wrap gap-2">
          {[
            "House parties & birthdays",
            "Weddings & receptions",
            "School dances & graduations",
            "Military balls & unit events",
            "Small business promos & pop-ups",
          ].map((label) => (
            <div
              key={label}
              className="rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 text-sm text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]"
            >
              {label}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold">Two ways to run your booth</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Choose the flow that matches your event size and staffing.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-[var(--color-text)]">Self-Service Mode</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Set up an iPad or iPhone with a ring light and let guests run the booth themselves.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-[var(--color-text)]">
              <li>• Perfect for parties, school dances, and unit socials</li>
              <li>• Guests tap, pose, and snap</li>
              <li>• AI background removal on paid plans</li>
              <li>• Instant delivery via email or text</li>
            </ul>
            <Link
              href="/pricing"
              className="inline-flex w-fit rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]"
            >
              See self-service plans
            </Link>
          </div>
          <div className="space-y-3 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-[var(--color-text)]">Photographer Mode</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                You or a hired photographer control the camera. Guests check in and pick their favorites.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-[var(--color-text)]">
              <li>• Check-in by name, email, or phone</li>
              <li>• Upload sets of photos for each guest</li>
              <li>• Guests select their favorites on a tablet</li>
              <li>• Great for weddings, formal events, and premium packages</li>
            </ul>
            <Link
              href="/photographers"
              className="inline-flex w-fit rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]"
            >
              Learn about Photographer Mode
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-3xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)]">
        <h2 className="text-3xl font-semibold">BoothOS vs traditional photo booth rentals</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-2xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-text-soft)]">BoothOS</p>
            <ul className="space-y-2 text-sm text-[var(--color-text)]">
              <li>• $0–$30 per event</li>
              <li>• One-time gear cost around $200</li>
              <li>• Unlimited reuse across multiple events</li>
              <li>• AI backgrounds, overlays, and instant downloads</li>
              <li>• You control the experience</li>
            </ul>
          </div>
          <div className="space-y-2 rounded-2xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Traditional rental</p>
            <ul className="space-y-2 text-sm text-[var(--color-text)]">
              <li>• $400–$1,000 per event</li>
              <li>• Limited to a 3–4 hour window</li>
              <li>• No reuse after the event</li>
              <li>• Often generic templates</li>
              <li>• Vendor schedule and rules</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--color-bg-subtle)] p-4 ring-1 ring-[var(--color-border-subtle)]">
          <p className="text-sm text-[var(--color-text-muted)]">
            Even if you only run one event, BoothOS can be cheaper than renting a traditional booth once.
          </p>
          <Link
            href="/pricing"
            className="rounded-full bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
          >
            View plans &amp; pricing
          </Link>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)]">
        <h2 className="text-3xl font-semibold">Real-world example</h2>
        <p className="text-base text-[var(--color-text-muted)]">
          At a unit holiday party with 120 guests, BoothOS ran on a single iPad with a ring light. Guests took over
          230 photos in three hours. The host saved more than $400 compared to renting a traditional booth and had a
          full gallery ready before the event ended.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl bg-[var(--color-surface)] p-6 text-center ring-1 ring-[var(--color-border-subtle)]">
        <h2 className="text-3xl font-semibold">Ready to run your first booth?</h2>
        <p className="text-base text-[var(--color-text-muted)]">
          Have a party, ball, or event coming up? You can be set up in under 15 minutes with BoothOS.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/get-started"
            className="rounded-full bg-[var(--gradient-brand)] px-5 py-3 font-semibold text-[var(--color-text-on-primary)] shadow-[0_15px_40px_rgba(155,92,255,0.35)] transition hover:opacity-95"
          >
            Start Free Booth
          </Link>
          <Link
            href="/photographers"
            className="rounded-full px-5 py-3 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
          >
            Learn about Photographer Mode
          </Link>
        </div>
      </section>
    </div>
  );
}
