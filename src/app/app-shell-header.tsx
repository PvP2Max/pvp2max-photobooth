"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderActions from "./header-actions";

const marketingPaths = [
  "/",
  "/how-it-works",
  "/pricing",
  "/savings",
  "/photographers",
  "/get-started",
];

export default function AppShellHeader() {
  const pathname = usePathname();

  const isMarketing =
    pathname === "/" ||
    marketingPaths.some(
      (path) => path !== "/" && (pathname === path || pathname.startsWith(`${path}/`)),
    );

  if (isMarketing) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-[color-mix(in_srgb,var(--color-border-subtle)_70%,transparent)] bg-[rgba(5,7,18,0.9)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border-subtle)]">
            <Image
              src="/assets/icon-transparent.png"
              alt="BoothOS"
              fill
              sizes="40px"
              className="object-contain"
              priority
            />
          </div>
          <span className="text-lg font-semibold text-[var(--color-text)]">BoothOS</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
          <HeaderActions />
        </nav>
      </div>
    </header>
  );
}
