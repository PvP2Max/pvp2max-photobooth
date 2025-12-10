import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-sm text-[var(--color-text-muted)]">
        <span>© {year} BoothOS. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <Link href="#" className="transition hover:text-[var(--color-text)]">
            Contact
          </Link>
          <Link href="#" className="transition hover:text-[var(--color-text)]">
            Privacy
          </Link>
          <Link href="#" className="transition hover:text-[var(--color-text)]">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
