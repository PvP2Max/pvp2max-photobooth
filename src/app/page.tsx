"use client";

import Link from "next/link";

const highlights = [
  {
    title: "Multi-business ready",
    body: "Event-scoped storage, per-event access keys, and admin download controls so each client stays isolated.",
  },
  {
    title: "On-site, cloud-free",
    body: "Background removal runs locally (withoutbg) with zero external upload; assets purge after delivery.",
  },
  {
    title: "Frictionless dual-lane",
    body: "Check-in, photographer upload, and front-desk styling stay in sync with live notifications.",
  },
  {
    title: "Share-ready in minutes",
    body: "Live previews, color-match toggle, and multiple backgrounds per photo—then link-only delivery.",
  },
];

const workflow = [
  { title: "Check-in", body: "Collect guest name + email once; auto-cleared after upload." },
  {
    title: "Capture",
    body: "Photographer picks the guest from a dropdown and uploads—cutouts process instantly.",
  },
  {
    title: "Style",
    body: "Front desk adds multiple backgrounds per photo, tweaks scale/position, and optional color-match.",
  },
  {
    title: "Deliver",
    body: "Email sends download links (no size limits); originals, cutouts, and composites are wiped.",
  },
];

const consoleLinks = [
  { title: "Check-in", body: "Register guests fast; auto-clear after upload.", href: "/checkin" },
  {
    title: "Photographer lane",
    body: "Phone-friendly upload tied to check-ins; instant cutouts.",
    href: "/photographer",
  },
  {
    title: "Front desk lane",
    body: "Search by email, add multiple backgrounds, color-match, and send links.",
    href: "/frontdesk",
  },
  {
    title: "Background library",
    body: "Upload, manage previews, and curate brand-safe sets.",
    href: "/backgrounds",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,rgba(155,92,255,0.08),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.1),transparent_30%),var(--color-bg)] text-[var(--color-text)]">
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-14">
        <section className="grid gap-10 overflow-hidden rounded-3xl bg-[var(--color-surface)] px-8 py-12 shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-border-subtle)] md:grid-cols-[1.35fr,1fr] md:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(155,92,255,0.14)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-primary-soft)] ring-1 ring-[var(--color-border-strong)]">
              BoothOS by Arctic Aura
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(34,211,238,0.18)] text-[10px] text-[var(--color-text)]">
                SaaS
              </span>
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              BoothOS for on-site teams and multi-client events.
            </h1>
            <p className="text-lg text-[var(--color-text-muted)]">
              Local processing, per-event access control, dual-lane workflow, multi-background previews, and link-only delivery that skips email size limits. Built to run on your own hardware or tunnel.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/frontdesk"
                className="rounded-full bg-[var(--gradient-brand)] px-5 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_15px_40px_rgba(155,92,255,0.35)] transition hover:opacity-95"
              >
                Launch console
              </Link>
              <Link
                href="/checkin"
                className="rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]"
              >
                Start check-in
              </Link>
              <Link
                href="/admin"
                className="rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]"
              >
                Admin
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-soft)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(34,197,94,0.16)] px-3 py-2 ring-1 ring-[rgba(34,197,94,0.35)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
                Local-only processing
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(56,189,248,0.14)] px-3 py-2 ring-1 ring-[rgba(56,189,248,0.35)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
                Link delivery (no size caps)
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(155,92,255,0.16)] px-3 py-2 ring-1 ring-[rgba(155,92,255,0.35)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary-soft)]" />
                Auto cleanup after send
              </div>
            </div>
          </div>

          <div className="relative isolate overflow-hidden rounded-3xl bg-[var(--color-surface-elevated)] p-6 ring-1 ring-[var(--color-border-subtle)]">
            <div className="absolute right-4 top-6 h-28 w-28 rounded-full bg-[rgba(155,92,255,0.28)] opacity-40 blur-3xl" />
            <div className="absolute -left-10 bottom-6 h-24 w-24 rounded-full bg-[rgba(34,211,238,0.25)] blur-3xl" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--color-text)]">Live console</p>
                <span className="rounded-full bg-[rgba(34,197,94,0.18)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]">
                  Background free
                </span>
              </div>
              <div className="rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border-subtle)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[var(--gradient-brand)]" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        Aurora Ridge Family
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-soft)]">
                        waiting for desk
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 text-[11px] text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]">
                    3 shots
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="relative h-36 overflow-hidden rounded-xl bg-[var(--color-bg-subtle)] ring-1 ring-[var(--color-border-subtle)]">
                    <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_25%_30%,rgba(155,92,255,0.25),transparent_35%),radial-gradient(circle_at_75%_70%,rgba(34,211,238,0.25),transparent_40%)]" />
                    <div className="absolute left-4 top-3 rounded-full bg-[rgba(255,255,255,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]">
                      Cutout
                    </div>
                    <div className="absolute bottom-3 left-4 rounded-full bg-[rgba(5,7,18,0.6)] px-3 py-1 text-[11px] text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)]">
                      Ready for background
                    </div>
                  </div>
                  <div className="flex h-36 flex-col justify-between rounded-xl bg-[var(--color-surface-elevated)] p-3 ring-1 ring-[var(--color-border-subtle)]">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-soft)]">
                        Background
                      </p>
                      <p className="text-sm font-semibold text-[var(--color-text)]">Glacial Night</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Color-matched to subject automatically.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[rgba(155,92,255,0.14)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text)] ring-1 ring-[rgba(155,92,255,0.35)]">
                        Live preview
                      </span>
                      <span className="rounded-full bg-[rgba(34,211,238,0.14)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text)] ring-1 ring-[rgba(34,211,238,0.35)]">
                        Link delivery
                      </span>
                      <span className="rounded-full bg-[rgba(34,197,94,0.14)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text)] ring-1 ring-[rgba(34,197,94,0.35)]">
                        Auto cleanup
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-2 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)]"
            >
              <p className="text-sm uppercase tracking-wide text-[var(--color-text-soft)]">
                {item.title}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-10 rounded-3xl bg-[var(--color-surface)] px-6 py-8 ring-1 ring-[var(--color-border-subtle)] md:grid-cols-[1fr,1.1fr] md:items-center">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-soft)]">
              Workflow
            </p>
            <h2 className="text-3xl font-semibold">
              Built to run on your own hardware and keep guests moving.
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Dual-lane, offline-friendly, and optimized for quick styling with link-only delivery to dodge email size limits.
            </p>
          </div>
          <div className="grid gap-4">
            {workflow.map((step, idx) => (
              <div
                key={step.title}
                className="relative overflow-hidden rounded-2xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)]"
              >
                <div className="absolute right-4 top-3 text-2xl font-semibold text-[var(--color-text-soft)]/40">
                  0{idx + 1}
                </div>
                <p className="text-sm uppercase tracking-wide text-[var(--color-text-soft)]">
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border-subtle)] md:grid-cols-3">
          {consoleLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-2xl bg-[var(--color-surface-elevated)] p-4 ring-1 ring-[var(--color-border-subtle)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-hover)]"
            >
              <p className="text-sm uppercase tracking-wide text-[var(--color-text-soft)]">
                {item.title}
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-text)]">
                Open
                <span className="transition group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
