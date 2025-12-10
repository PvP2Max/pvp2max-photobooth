import Footer from "../components/Footer";
import Header from "../components/Header";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />
      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-12">{children}</main>
      <Footer />
    </div>
  );
}
