import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoothOS - Event Photobooth Platform",
  description: "Professional event photobooth with AI backgrounds and instant delivery",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
