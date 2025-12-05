"use client";

import Link from "next/link";

const features = [
  {
    title: "Cinematic swaps in minutes",
    body: "Capture, remove the background on our own server, style with curated or branded sets, and email the finished shots while guests are still at the booth.",
  },
  {
    title: "Hands-off for your team",
    body: "Two-lane console keeps photographers and the front desk in sync with live previews, instant notifications, and auto-cleanup after delivery.",
  },
  {
    title: "Private by design",
    body: "No public clouds—background removal runs locally (withoutbg), assets stay on the event server, and post-send purge keeps storage lean.",
  },
];

const workflow = [
  {
    title: "Capture & tag",
    body: "Photographer uploads from phone, tagging each family by email so every set stays organized.",
  },
  {
    title: "Cutout instantly",
    body: "The local remover strips backgrounds in seconds; front desk gets a toast when new shots are ready.",
  },
  {
    title: "Style with live previews",
    body: "Scale and position subjects over seasonal or branded backgrounds, all on a responsive canvas.",
  },
  {
    title: "Send & purge",
    body: "Clients receive PNGs via email; originals, cutouts, and composites are wiped right after send.",
  },
];

const consoleLinks = [
  {
    title: "Photographer lane",
    body: "Phone-friendly upload flow that batches shots per client email.",
    href: "/photographer",
  },
  {
    title: "Front desk lane",
    body: "Search by email, preview backgrounds, tune framing, and email sets.",
    href: "/frontdesk",
  },
  {
    title: "Background library",
    body: "Upload custom art or curate seasonal sets before the event.",
    href: "/backgrounds",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.14),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(190,24,93,0.12),transparent_30%)]" />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-14">
        <section className="grid gap-10 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/70 to-slate-800 px-8 py-12 shadow-2xl ring-1 ring-white/10 md:grid-cols-[1.35fr,1fr] md:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200/80 ring-1 ring-white/10">
              Arctic Aura Photobooth
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-[10px] text-emerald-200">
                Pro
              </span>
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Photobooth experiences with share-ready edits before guests leave the
              floor.
            </h1>
            <p className="text-lg text-slate-200/80">
              Arctic Aura Designs pairs on-site capture with local background removal,
              curated backdrops, and email delivery—all in one console tuned for busy
              event teams.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-200/80">
              <Link
                href="mailto:events@arcticauradesigns.com?subject=Photobooth%20Booking"
                className="rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300 px-5 py-2 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-200 hover:via-emerald-200 hover:to-amber-200"
              >
                Book the photobooth
              </Link>
              <Link
                href="/frontdesk"
                className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15 transition hover:bg-white/15"
              >
                See the console
              </Link>
              <Link
                href="/photographer"
                className="rounded-full bg-white/5 px-4 py-2 ring-1 ring-white/10 transition hover:bg-white/10"
              >
                Photographer upload
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-300/90">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-2 ring-1 ring-emerald-400/30">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                Local-only processing (withoutbg)
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-2 ring-1 ring-cyan-400/30">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                Live previews & instant email
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-pink-500/10 px-3 py-2 ring-1 ring-pink-400/30">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-300" />
                Auto-cleanup after delivery
              </div>
            </div>
          </div>

          <div className="relative isolate overflow-hidden rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="absolute right-4 top-6 h-28 w-28 rounded-full bg-gradient-to-br from-cyan-400 to-amber-400 opacity-30 blur-3xl" />
            <div className="absolute -left-10 bottom-6 h-24 w-24 rounded-full bg-gradient-to-br from-pink-500 to-cyan-400 opacity-25 blur-3xl" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Live event console</p>
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-400/40">
                  Background free
                </span>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-800/70 p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Aurora Ridge Family
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300/70">
                        waiting for desk
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-white ring-1 ring-white/15">
                    3 shots
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="relative h-36 overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 ring-1 ring-white/10">
                    <div className="absolute inset-0">
                      <div className="absolute left-5 top-5 h-16 w-12 rounded-xl bg-gradient-to-b from-cyan-300 to-sky-600 blur-lg opacity-70" />
                      <div className="absolute left-8 top-6 h-20 w-14 rounded-xl bg-gradient-to-b from-emerald-300 to-blue-700 ring-1 ring-white/10" />
                      <div className="absolute right-4 bottom-3 h-24 w-24 rounded-2xl bg-gradient-to-br from-amber-200 via-pink-300 to-fuchsia-500 opacity-80 ring-1 ring-white/10" />
                    </div>
                    <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                      Cutout
                    </div>
                    <div className="absolute bottom-3 left-4 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] text-slate-100 ring-1 ring-white/10">
                      Ready for background
                    </div>
                  </div>
                  <div className="flex h-36 flex-col justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
                        Background
                      </p>
                      <p className="text-sm font-semibold text-white">Glacial Night</p>
                      <p className="text-xs text-slate-300/80">
                        Crisp blues with aurora edges for Alaska events.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-100 ring-1 ring-amber-300/40">
                        Live preview
                      </span>
                      <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-semibold text-emerald-100 ring-1 ring-emerald-300/40">
                        Auto email
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/20">
                        Clean storage
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-black/20 p-3 ring-1 ring-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-300 to-cyan-400 ring-1 ring-white/10" />
                  <div>
                    <p className="text-sm font-semibold text-white">Auto cleanup</p>
                    <p className="text-xs text-slate-300/80">
                      Originals, cutouts, and composites purge post-send.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white ring-1 ring-white/15">
                  Protected
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {features.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-2 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10"
            >
              <p className="text-sm uppercase tracking-wide text-cyan-200/80">
                {item.title}
              </p>
              <p className="text-sm text-slate-200/80">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-10 rounded-3xl bg-white/5 px-6 py-8 ring-1 ring-white/10 md:grid-cols-[1fr,1.1fr] md:items-center">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-200/80">
              Event flow
            </p>
            <h2 className="text-3xl font-semibold text-white">
              Built for rush-hour booth traffic and tight schedules.
            </h2>
            <p className="text-sm text-slate-300/80">
              The Arctic Aura photobooth stays offline-friendly, surfaces new uploads
              instantly, and sends share-ready PNGs without leaving residue on the
              server.
            </p>
          </div>
          <div className="grid gap-4">
            {workflow.map((step, idx) => (
              <div
                key={step.title}
                className="relative overflow-hidden rounded-2xl bg-black/20 p-4 ring-1 ring-white/5"
              >
                <div className="absolute right-4 top-3 text-2xl font-semibold text-white/20">
                  0{idx + 1}
                </div>
                <p className="text-sm uppercase tracking-wide text-emerald-200/80">
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-slate-200/80">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 md:grid-cols-3">
          {consoleLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-2xl bg-black/15 p-4 ring-1 ring-white/5 transition hover:-translate-y-1 hover:ring-white/20"
            >
              <p className="text-sm uppercase tracking-wide text-cyan-200/80">
                {item.title}
              </p>
              <p className="mt-2 text-sm text-slate-200/80">{item.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white">
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
