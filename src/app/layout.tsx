import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoothOS | Arctic Aura Designs",
  description:
    "Upload, style, and deliver background-free photobooth shots with live previews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="sticky top-0 z-20 bg-[rgba(5,7,18,0.9)] backdrop-blur border-b border-[color-mix(in_srgb,var(--color-border-subtle)_70%,transparent)]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[var(--gradient-brand)] shadow-[0_10px_25px_rgba(155,92,255,0.3)]" />
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-soft)]">
                  Arctic Aura
                </p>
                <p className="text-sm font-semibold text-[var(--color-text)]">BoothOS</p>
              </div>
            </Link>
            <nav className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
              <Link
                href="/"
                className="rounded-full px-3 py-2 hover:bg-[rgba(155,92,255,0.12)] transition text-[var(--color-text)]"
              >
                Home
              </Link>
              <Link
                href="/checkin"
                className="rounded-full px-3 py-2 hover:bg-[rgba(155,92,255,0.12)] transition"
              >
                Check-in
              </Link>
              <Link
                href="/photographer"
                className="rounded-full px-3 py-2 hover:bg-[rgba(155,92,255,0.12)] transition"
              >
                Photographer
              </Link>
              <Link
                href="/frontdesk"
                className="rounded-full px-3 py-2 hover:bg-[rgba(155,92,255,0.12)] transition"
              >
                Front Desk
              </Link>
              <Link
                href="/backgrounds"
                className="rounded-full px-3 py-2 hover:bg-[rgba(155,92,255,0.12)] transition"
              >
                Backgrounds
              </Link>
              <Link
                href="/business"
                className="rounded-full bg-[rgba(34,211,238,0.14)] px-3 py-2 font-semibold text-[var(--color-text)] ring-1 ring-[rgba(34,211,238,0.35)] transition hover:bg-[rgba(34,211,238,0.24)]"
              >
                Log in
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
