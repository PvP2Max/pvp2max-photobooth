import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Photobooth | Arctic Aura Designs",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="sticky top-0 z-20 bg-slate-950/75 backdrop-blur border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-pink-400" />
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">
                  Arctic Aura
                </p>
                <p className="text-sm font-semibold text-white">Photobooth Console</p>
              </div>
            </Link>
            <nav className="flex items-center gap-3 text-sm text-slate-200">
              <Link
                href="/"
                className="rounded-full px-3 py-2 hover:bg-white/10 transition"
              >
                Home
              </Link>
              <Link
                href="/photographer"
                className="rounded-full px-3 py-2 hover:bg-white/10 transition"
              >
                Photographer
              </Link>
              <Link
                href="/frontdesk"
                className="rounded-full px-3 py-2 hover:bg-white/10 transition"
              >
                Front Desk
              </Link>
              <Link
                href="/backgrounds"
                className="rounded-full px-3 py-2 hover:bg-white/10 transition"
              >
                Backgrounds
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
