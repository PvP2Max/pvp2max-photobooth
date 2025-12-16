"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/savings", label: "Savings" },
  { href: "/photographers", label: "For Photographers" },
  { href: "/get-started", label: "Get Started" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border-subtle)] bg-[rgba(5,7,18,0.95)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:gap-6 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] ring-1 ring-[var(--color-border-subtle)]">
            <span className="text-lg font-semibold text-[var(--color-primary)]">B</span>
          </div>
          <span className="text-lg font-semibold text-[var(--color-text)]">BoothOS</span>
        </Link>

        {/* Desktop nav - hidden on mobile */}
        <nav className="hidden flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)] md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 transition hover:text-[var(--color-text)] hover:ring-1 hover:ring-[var(--color-border-strong)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions - hidden on mobile */}
        <div className="hidden items-center gap-3 text-sm md:flex">
          <Link
            href="/login"
            className="rounded-full px-3 py-2 font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-elevated)] hover:ring-1 hover:ring-[var(--color-border-subtle)]"
          >
            Login
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-[var(--gradient-brand)] px-4 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_10px_25px_rgba(155,92,255,0.3)] transition hover:opacity-90"
          >
            Dashboard
          </Link>
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] ring-1 ring-[var(--color-border-subtle)] md:hidden"
          aria-label="Open menu"
        >
          <svg
            className="h-5 w-5 text-[var(--color-text)]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-out menu */}
          <div className="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-[var(--color-bg)] shadow-2xl">
            {/* Menu header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-4">
              <span className="text-lg font-semibold text-[var(--color-text)]">Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] ring-1 ring-[var(--color-border-subtle)]"
                aria-label="Close menu"
              >
                <svg
                  className="h-5 w-5 text-[var(--color-text)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu content */}
            <nav className="flex flex-col gap-1 p-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-base text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Menu footer actions */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--color-border-subtle)] p-4">
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-xl bg-[var(--color-surface-elevated)] px-4 py-3 text-center font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface)]"
                >
                  Login
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-xl bg-[var(--gradient-brand)] px-4 py-3 text-center font-semibold text-[var(--color-text-on-primary)] shadow-[0_10px_25px_rgba(155,92,255,0.3)] transition hover:opacity-90"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
