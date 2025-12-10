import type { Metadata } from "next";
import "./globals.css";
import AppShellHeader from "./app-shell-header";

export const metadata: Metadata = {
  title: "BoothOS | Arctic Aura Designs",
  description:
    "Upload, style, and deliver background-free photobooth shots with live previews.",
  icons: [
    { rel: "icon", url: "/assets/icon-transparent.png" },
    { rel: "shortcut icon", url: "/assets/icon-transparent.png" },
    { rel: "apple-touch-icon", url: "/assets/icon-transparent.png" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShellHeader />
        {children}
      </body>
    </html>
  );
}
