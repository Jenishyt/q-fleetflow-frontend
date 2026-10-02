"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BASE_PORTS, EXTRA_PORTS } from "@/lib/sea/ports";

type Cmd = { id: string; label: string; hint: string; href: string; group: string };

const PAGES: Cmd[] = [
  { id: "p-home", label: "Overview", hint: "Home", href: "/", group: "Go to" },
  { id: "p-predict", label: "Fuel prediction explorer", hint: "/predict", href: "/predict", group: "Go to" },
  { id: "p-opt", label: "Run the optimizer", hint: "/optimize", href: "/optimize", group: "Go to" },
  { id: "p-cmp", label: "Benchmark comparison", hint: "/compare", href: "/compare", group: "Go to" },
  { id: "p-map", label: "Maritime route map", hint: "/map", href: "/map", group: "Go to" },
  { id: "p-ports", label: "Ports database", hint: "/ports", href: "/ports", group: "Go to" },
  { id: "p-fleet", label: "Fleet registry", hint: "/fleet", href: "/fleet", group: "Go to" },
  { id: "p-road", label: "Roadmap & progress", hint: "/roadmap", href: "/roadmap", group: "Go to" },
];
const ROUTES: Cmd[] = [
  ["Chennai → Colombo", "INMAA", "LKCMB"], ["Chennai → Singapore", "INMAA", "SGSIN"], ["Chennai → Cochin", "INMAA", "INCOK"],
  ["Mumbai → Rotterdam", "INBOM", "NLRTM"], ["Singapore → Rotterdam", "SGSIN", "NLRTM"], ["Shanghai → Los Angeles", "CNSHA", "USLAX"],
].map(([label, a, b]) => ({ id: `r-${a}-${b}`, label: `Route: ${label}`, hint: "opens on map", href: `/map?from=${a}&to=${b}`, group: "Routes" }));
const PORTS: Cmd[] = [...BASE_PORTS, ...EXTRA_PORTS].map((p) => ({ id: `port-${p.locode}`, label: `Port: ${p.name}`, hint: `${p.locode} · ${p.country}`, href: `/map?from=${p.locode}`, group: "Ports" }));
const ALL = [...PAGES, ...ROUTES, ...PORTS];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const openRef = useRef(false);
  useEffect(() => { openRef.current = open; if (open) { const t = setTimeout(() => inputRef.current?.focus(), 30); return () => clearTimeout(t); } }, [open]);
  // state is reset on close so the next open always starts clean
  const close = useCallback(() => { setOpen(false); setQ(""); setHi(0); }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (openRef.current) close(); else setOpen(true); }
      if (e.key === "Escape") close();
    };
    const ext = () => setOpen(true);
    window.addEventListener("keydown", key);
    window.addEventListener("open-palette", ext);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("open-palette", ext); };
  }, [close]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s ? ALL.filter((c) => (c.label + " " + c.hint).toLowerCase().includes(s)) : [...PAGES, ...ROUTES];
    return base.slice(0, 9);
  }, [q]);
  const go = (c: Cmd) => { close(); router.push(c.href); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[1200] flex items-start justify-center pt-[14vh] px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={close} />
          <motion.div initial={{ opacity: 0, y: -14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative w-full max-w-xl glass rounded-md shadow-2xl overflow-hidden">
            <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }} placeholder="Jump to a page, route or port…"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
                if (e.key === "Enter" && results[hi]) go(results[hi]);
              }}
              className="w-full bg-transparent px-5 py-4 text-base border-b rule focus:outline-none placeholder:text-paper/35" />
            <ul className="max-h-[50vh] overflow-y-auto py-1">
              {results.length === 0 && <li className="px-5 py-6 text-sm text-paper/45">Nothing matches “{q}”.</li>}
              {results.map((c, i) => (
                <li key={c.id}>
                  <button onMouseEnter={() => setHi(i)} onClick={() => go(c)} className={`w-full flex items-center justify-between px-5 py-2.5 text-left text-sm transition-colors ${i === hi ? "bg-paper/10" : ""}`}>
                    <span><span className="font-mono text-[10px] uppercase tracking-wider text-brass-bright/80 mr-2">{c.group}</span>{c.label}</span>
                    <span className="font-mono text-[11px] text-paper/40">{c.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-between px-5 py-2 border-t rule font-mono text-[10px] text-paper/35"><span>↑↓ navigate · ↵ open</span><span>esc close</span></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
