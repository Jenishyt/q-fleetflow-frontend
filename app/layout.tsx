import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Q-FleetFlow",
  description: "Quantum-inspired fuel prediction and green fleet optimization",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-ink text-paper">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
