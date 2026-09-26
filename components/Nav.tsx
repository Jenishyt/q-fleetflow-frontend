"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";

const links = [
  { href: "/", label: "Overview" },
  { href: "/predict", label: "Predict" },
  { href: "/optimize", label: "Run optimizer" },
  { href: "/map", label: "Map" },
  { href: "/ports", label: "Ports" },
  { href: "/fleet", label: "Fleet" },
];

export default function Nav() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const active = hovered ?? pathname;

  return (
    <header className="border-b rule sticky top-0 z-50 backdrop-blur bg-ink/85">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2 group">
          <motion.span
            className="font-display text-xl tracking-tight inline-block"
            whileHover={{ letterSpacing: "0.01em" }}
            transition={{ duration: 0.2 }}
          >
            Q-FleetFlow
          </motion.span>
          <span className="font-mono text-[11px] text-paper/50">v0.1</span>
        </Link>
        <nav className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
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
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
