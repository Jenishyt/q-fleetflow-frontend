import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Preloader from "@/components/Preloader";

export const metadata: Metadata = {
  title: "Q-FleetFlow",
  description: "Quantum-inspired fuel prediction and green fleet optimization",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-ink text-paper">
        <Preloader>
          <Nav />
          <main className="flex-1">{children}</main>
        </Preloader>
      </body>
    </html>
  );
}
