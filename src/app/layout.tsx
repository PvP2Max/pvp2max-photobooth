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
              <div className="relative h-10 w-10 overflow-hidden rounded-xl ring-1 ring-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                <Image src="/assets/icon-transparent.png" alt="BoothOS" fill sizes="40px" className="object-contain" priority />
              </div>
              <span className="text-lg font-semibold text-[var(--color-text)]">BoothOS</span>
            </Link>
            <nav className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
              <HeaderActions />
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
