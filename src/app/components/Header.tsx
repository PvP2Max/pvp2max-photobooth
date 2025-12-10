import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/savings", label: "Savings" },
  { href: "/photographers", label: "For Photographers" },
  { href: "/get-started", label: "Get Started" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border-subtle)] bg-[rgba(5,7,18,0.95)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] ring-1 ring-[var(--color-border-subtle)]">
            <span className="text-lg font-semibold text-[var(--color-primary)]">B</span>
          </div>
          <span className="text-lg font-semibold text-[var(--color-text)]">BoothOS</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
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

        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-full px-3 py-2 font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-elevated)] hover:ring-1 hover:ring-[var(--color-border-subtle)]"
          >
            Login
          </Link>
          <Link
            href="/app/dashboard"
            className="rounded-full bg-[var(--gradient-brand)] px-4 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-[0_10px_25px_rgba(155,92,255,0.3)] transition hover:opacity-90"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
