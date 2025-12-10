import Link from "next/link";

const steps = [
  {
    title: "1. Create your event",
    body: "Log in, choose your plan, pick a theme, and generate your event QR code. BoothOS handles all the tech behind the scenes.",
  },
  {
    title: "2. Set up your iPad booth",
    body: "Mount your iPad or iPhone on a tripod, add a ring light, and place it 2–3 feet from a light gray wall or backdrop for best results.",
  },
  {
    title: "3. Guests tap, pose, and snap",
    body: "Guests walk up, tap the screen, take their photo, and BoothOS automatically applies overlays and AI background removal depending on your plan.",
  },
  {
    title: "4. Instant delivery",
    body: "Each guest gets a link to download their photos by email or text—no massive attachments, no headaches.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">How BoothOS Works</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          From setup to sharing, BoothOS is designed to be easy for hosts and fun for guests.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.title}
            className="rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-text-soft)]">
              {step.title}
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-[var(--color-surface-elevated)] p-6 ring-1 ring-[var(--color-border-subtle)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-base font-semibold text-[var(--color-text)]">
              Want the best results? Check out our recommended gear and setup guide.
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              We keep the gear list short and affordable so you can get great lighting and clean
              cutouts without renting hardware.
            </p>
          </div>
          <Link
            href="/get-started"
            className="inline-flex w-fit items-center justify-center rounded-full bg-[var(--gradient-brand)] px-4 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
          >
            View setup guide
          </Link>
        </div>
      </div>
    </div>
  );
}
