"use client";

import Image from "next/image";
import Link from "next/link";

const highlights = [
  {
    title: "Photographer lane",
    body: "Drop one or many shots per family; backgrounds are removed automatically via the secured bgremover.",
    href: "/photographer",
  },
  {
    title: "Front desk lane",
    body: "Search by email, pick backgrounds with live previews, email sets, and auto-clean storage.",
    href: "/frontdesk",
  },
  {
    title: "Background library",
    body: "Use curated Christmas/Alaska sets or upload custom backdrops on the fly.",
    href: "/backgrounds",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.14),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(190,24,93,0.12),transparent_30%)]" />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14">
        <section className="grid gap-10 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/70 to-slate-800 px-8 py-12 shadow-2xl ring-1 ring-white/10 md:grid-cols-[1.6fr,1fr] md:items-center">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/80">
              Arctic Aura Photobooth
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              A polished console for the booth team.
            </h1>
            <p className="text-lg text-slate-200/80">
              The landing page is client-facing when mirrored; navigation takes staff
              to dedicated workflows so the screen stays professional and focused.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-200/80">
              <Link
                href="/photographer"
                className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15 hover:bg-white/15"
              >
                Enter photographer lane
              </Link>
              <Link
                href="/frontdesk"
                className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15 hover:bg-white/15"
              >
                Enter front desk lane
              </Link>
              <Link
                href="/backgrounds"
                className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15 hover:bg-white/15"
              >
                Manage backgrounds
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="absolute right-6 top-6 h-12 w-12 rounded-full bg-gradient-to-br from-pink-400 to-cyan-300 opacity-60 blur-xl" />
            <Image
              src="/backgrounds/winter-lights.svg"
              alt="Hero"
              width={1400}
              height={900}
              className="rounded-xl ring-1 ring-white/10"
              priority
            />
            <p className="mt-3 text-xs text-slate-300/80">
              Background selections preview instantly; email delivery purges stored
              assets for lean operations.
            </p>
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 md:grid-cols-3">
          {highlights.map((item) => (
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
