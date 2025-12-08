import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import HeaderActions from "./header-actions";

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
              <div className="relative h-10 w-10 overflow-hidden rounded-xl ring-1 ring-[var(--color-border-subtle)]">
                <Image src="/assets/icon-transparent.png" alt="BoothOS" fill sizes="40px" className="object-contain" />
              </div>
              <Image
                src="/assets/horizontal-transparent.png"
                alt="BoothOS wordmark"
                width={150}
                height={40}
                className="hidden sm:block"
              />
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
              <HeaderActions />
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
