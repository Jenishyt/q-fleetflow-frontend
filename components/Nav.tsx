"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const links = [
  { href: "/", label: "Overview" },
  { href: "/predict", label: "Predict" },
  { href: "/optimize", label: "Run optimizer" },
  { href: "/compare", label: "Compare" },
  { href: "/map", label: "Map" },
  { href: "/ports", label: "Ports" },
  { href: "/fleet", label: "Fleet" },
  { href: "/roadmap", label: "Roadmap" },
];

export default function Nav() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = hovered ?? pathname;

  return (
    <header className="border-b rule sticky top-0 z-50 backdrop-blur bg-ink/85">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-baseline gap-2 group">
          <span className="glitch-logo font-display text-xl tracking-tight" data-text="Q-FORGE">
            Q-FORGE
          </span>
          <span className="font-mono text-[11px] text-paper/50">v0.1</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onMouseEnter={() => setHovered(l.href)}
              className="relative px-3 py-1.5 text-sm"
            >
              {active === l.href && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-paper/8 rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span
                className={`relative z-10 transition-colors ${
                  pathname === l.href ? "text-brass-bright" : "text-paper/60 hover:text-paper"
                }`}
              >
                {l.label}
              </span>
              {l.href === "/map" && <span className="relative z-10 ml-1 text-[9px] font-mono text-ink bg-brass-bright rounded-sm px-1 py-px align-middle">NEW</span>}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => window.dispatchEvent(new Event("open-palette"))}
          className="hidden md:flex items-center gap-2 border rule rounded-full px-3 py-1 text-xs text-paper/50 hover:text-paper hover:border-brass transition-colors"
          aria-label="Open command palette"
        >
          Search <kbd className="font-mono text-[10px] text-paper/40">Ctrl K</kbd>
        </button>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <motion.span animate={{ rotate: mobileOpen ? 45 : 0, y: mobileOpen ? 6 : 0 }} className="block w-5 h-px bg-paper" />
          <motion.span animate={{ opacity: mobileOpen ? 0 : 1 }} className="block w-5 h-px bg-paper" />
          <motion.span animate={{ rotate: mobileOpen ? -45 : 0, y: mobileOpen ? -6 : 0 }} className="block w-5 h-px bg-paper" />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t rule"
          >
            <div className="px-6 py-3 flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={`py-2 text-sm ${pathname === l.href ? "text-brass-bright" : "text-paper/60"}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
