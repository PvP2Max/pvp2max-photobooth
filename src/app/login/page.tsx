import Link from "next/link";

export const metadata = {
  title: "Login | BoothOS",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="overflow-hidden rounded-3xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
          <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-6 py-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-soft)]">BoothOS</p>
            <h1 className="text-2xl font-semibold text-[var(--color-text)]">Login</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Choose how you want to sign in. Business login unlocks the console, events, and staff tools.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="rounded-2xl bg-[var(--color-surface-elevated)] p-5 ring-1 ring-[var(--color-border-subtle)]">
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Business console</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">Sign in or register</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Manage events, background assets, delivery history, and billing.
              </p>
              <Link
                href="/business"
                className="mt-3 inline-flex w-fit items-center justify-center rounded-full bg-[var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
              >
                Go to business login
              </Link>
            </div>

            <div className="rounded-2xl bg-[var(--color-surface-elevated)] p-5 ring-1 ring-[var(--color-border-subtle)]">
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-text-soft)]">Already signed in?</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">Open your dashboard</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                If you already have a session, jump straight into the BoothOS dashboard and tools.
              </p>
              <Link
                href="/app/dashboard"
                className="mt-3 inline-flex w-fit items-center justify-center rounded-full bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]/80"
              >
                Go to dashboard
              </Link>
            </div>

            <div className="md:col-span-2 rounded-2xl bg-[var(--color-bg-subtle)] p-5 ring-1 ring-[var(--color-border-subtle)]">
              <h3 className="text-base font-semibold text-[var(--color-text)]">Need staff access?</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Staff devices should use the event links generated in the Business console for booth, check-in,
                photographer, or front desk lanes. If you don’t have an event key, ask the host to share the event link.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
