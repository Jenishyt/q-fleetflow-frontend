"use client";

import Link from "next/link";
import { BackendPill } from "@/components/WelcomeModal";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const mainLinks = [
  { href: "/", label: "Overview" },
  { href: "/predict", label: "Predict" },
  { href: "/optimize", label: "Optimize" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/compare", label: "Compare" },
  { href: "/solution", label: "Solution" },
  { href: "/map", label: "Map" },
];
const moreLinks = [
  { href: "/logistics", label: "Logistics" },
  { href: "/model", label: "Math model" },
  { href: "/ports", label: "Ports" },
  { href: "/fleet", label: "Fleet" },
  { href: "/roadmap", label: "Roadmap" },
];
const links = [...mainLinks, ...moreLinks];

export default function Nav() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const active = hovered ?? pathname;

  return (
    <header className="border-b rule sticky top-0 z-[1050] backdrop-blur bg-ink/85">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 whitespace-nowrap">
        <Link href="/" className="flex items-baseline gap-2 group shrink-0">
          <span className="glitch-logo font-display text-xl tracking-tight" data-text="Q-FORGE">
            Q-FORGE
          </span>
          <span className="font-mono text-[11px] text-paper/50">v0.1</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1" onMouseLeave={() => setHovered(null)}>
          {mainLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onMouseEnter={() => setHovered(l.href)}
              className="relative px-2.5 xl:px-3 py-1.5 text-sm"
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
                  pathname === l.href ? "text-brass-bright" : l.href === "/solution" || l.href === "/map" ? "text-paper/90 hover:text-paper" : "text-paper/60 hover:text-paper"
                }`}
              >
                {l.label}
              </span>
              {(l.href === "/solution" || l.href === "/map") && (
                <span className="relative z-10 ml-1.5 inline-flex h-1.5 w-1.5 align-middle" title="Worth a look">
                  <span className="absolute inset-0 rounded-full bg-brass-bright opacity-60 animate-ping" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-brass-bright" />
                </span>
              )}
            </Link>
          ))}
          <div className="relative" onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
            <button
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className={`px-2.5 xl:px-3 py-1.5 text-sm transition-colors ${moreLinks.some((l) => l.href === pathname) ? "text-brass-bright" : "text-paper/60 hover:text-paper"}`}
            >
              More <span className="text-[10px]">▾</span>
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.14 }} className="absolute right-0 top-full pt-2 z-50"
                >
                  <div className="glass rounded-sm py-1.5 min-w-[160px] shadow-2xl">
                    {moreLinks.map((l) => (
                      <Link key={l.href} href={l.href} onClick={() => setMoreOpen(false)}
                        className={`flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-paper/10 ${pathname === l.href ? "text-brass-bright" : "text-paper/75"}`}>{l.label}{l.href === "/logistics" && <span className="text-[9px] font-mono text-ink bg-brass-bright rounded-sm px-1 py-px">NEW</span>}</Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="hidden lg:block shrink-0"><BackendPill /></div>
        <button
          onClick={() => window.dispatchEvent(new Event("open-palette"))}
          className="hidden xl:flex shrink-0 items-center gap-2 border rule rounded-full px-3 py-1 text-xs text-paper/50 hover:text-paper hover:border-brass transition-colors"
          aria-label="Open command palette"
        >
          Search <kbd className="font-mono text-[10px] text-paper/40">Ctrl K</kbd>
        </button>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden flex flex-col gap-1.5 p-2"
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
            className="lg:hidden overflow-hidden border-t rule"
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
