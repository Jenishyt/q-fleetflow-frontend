import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Preloader from "@/components/Preloader";
import { ToastProvider } from "@/components/Toast";
import Ambient from "@/components/Ambient";
import CommandPalette from "@/components/CommandPalette";

export const metadata: Metadata = {
  title: "Q-FORGE",
  description: "Quantum-inspired fuel prediction and green fleet optimization",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-ink text-paper">
        <ToastProvider>
          <Preloader>
            <Ambient />
            <Nav />
            <CommandPalette />
            <main className="flex-1">{children}</main>
          </Preloader>
        </ToastProvider>
      </body>
    </html>
  );
}
