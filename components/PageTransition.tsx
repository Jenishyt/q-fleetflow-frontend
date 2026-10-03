"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";

// Order of the nav: moving "forward" swaps the page in from the right, "back" from the left.
const ORDER = ["/", "/predict", "/optimize", "/compare", "/solution", "/map", "/ports", "/fleet", "/roadmap"];
const NAMES: Record<string, string> = {
  "/": "Overview", "/predict": "Predict", "/optimize": "Optimize", "/compare": "Compare", "/solution": "Solution",
  "/map": "Map", "/ports": "Ports", "/fleet": "Fleet", "/roadmap": "Roadmap",
};
const idx = (p: string) => { const i = ORDER.indexOf(p); return i >= 0 ? i : p.startsWith("/run") ? ORDER.indexOf("/optimize") : 0; };
const nameOf = (p: string) => NAMES[p] ?? (p.startsWith("/run") ? "Results" : "Q-FORGE");
const EASE = [0.76, 0, 0.24, 1] as const;
const OFF = 112; // panels are wider than the screen so the slanted edge fully clears it

/** Cover-and-reveal page swap. Internal link clicks slide a panel over the screen, navigate underneath, then slide it away. */
export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const front = useAnimationControls();
  const back = useAnimationControls();
  const [dir, setDir] = useState(1);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const first = useRef(true);
  const guard = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dirRef = useRef(1);

  const reveal = useCallback(async () => {
    const d = dirRef.current;
    await front.start({ x: `${-d * OFF}%`, transition: { duration: 0.55, ease: EASE } });
    back.start({ x: `${-d * OFF}%`, transition: { duration: 0.5, ease: EASE, delay: 0.04 } }).then(() => { setBusy(false); });
  }, [front, back]);

  const cover = useCallback(async (d: number, name: string) => {
    dirRef.current = d; setDir(d); setLabel(name); setBusy(true);
    front.set({ x: `${d * OFF}%` }); back.set({ x: `${d * OFF}%` });
    back.start({ x: "0%", transition: { duration: 0.42, ease: EASE } });
    await front.start({ x: "0%", transition: { duration: 0.46, ease: EASE, delay: 0.06 } });
  }, [front, back]);

  // pathname changed: either our own navigation (already covered) or a back/forward/programmatic one
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    clearTimeout(guard.current);
    if (pending.current) { pending.current = false; reveal(); return; }
    (async () => {
      const d = 1;
      dirRef.current = d; setDir(d); setLabel(nameOf(pathname)); setBusy(true);
      front.set({ x: "0%" }); back.set({ x: "0%" });
      await reveal();
    })();
  }, [pathname, reveal, front, back]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname) return; // same page: let Next handle query/hash changes
      e.preventDefault(); e.stopPropagation();
      const d = idx(url.pathname) >= idx(window.location.pathname) ? 1 : -1;
      pending.current = true;
      cover(d, nameOf(url.pathname)).then(() => {
        router.push(url.pathname + url.search + url.hash);
        guard.current = setTimeout(() => { if (pending.current) { pending.current = false; reveal(); } }, 3500);
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [cover, reveal, router]);

  const slant = (d: number) => (d > 0 ? "polygon(9% 0,100% 0,100% 100%,0 100%)" : "polygon(0 0,91% 0,100% 100%,0 100%)");
  const panel = { position: "absolute" as const, top: 0, bottom: 0, left: `${-(OFF - 100) / 2}%`, width: `${OFF}%` };

  return (
    <div aria-hidden className={`fixed inset-0 z-[1400] overflow-hidden ${busy ? "pointer-events-auto" : "pointer-events-none"}`} style={{ visibility: busy ? "visible" : "hidden" }}>
      <motion.div animate={back} initial={{ x: `${OFF}%` }} style={{ ...panel, clipPath: slant(dir), background: "linear-gradient(120deg,#8a6128,#d2a35c 55%,#f4d9a6)" }} />
      <motion.div animate={front} initial={{ x: `${OFF}%` }} style={{ ...panel, clipPath: slant(dir), background: "#0b1f2e" }}
        className="flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-[11px] tracking-[0.3em] text-brass-bright mb-3">Q-FORGE</div>
          <div className="font-display text-5xl md:text-7xl text-paper">{label}</div>
          <svg viewBox="0 0 200 20" className="w-48 mx-auto mt-5 opacity-70"><path d="M0,10 C25,0 50,20 75,10 S125,0 150,10 S190,18 200,10" fill="none" stroke="#d2a35c" strokeWidth="1.5" strokeDasharray="6 5" className="route-flow" /></svg>
        </div>
      </motion.div>
    </div>
  );
}
