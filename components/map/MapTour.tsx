"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface TourStep { id: string; title: string; body: ReactNode; target?: string; action?: string; where?: "map" | "center" }
interface Rect { x: number; y: number; w: number; h: number }
const PAD = 6;

/** Spotlight tour: dims the screen, cuts a glowing hole around a [data-tour] element and explains it. */
export default function MapTour({ open, steps, onAction, onClose }: { open: boolean; steps: TourStep[]; onAction: (a?: string) => void; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vp, setVp] = useState({ w: 1200, h: 800 });
  const act = useRef(onAction);
  useEffect(() => { act.current = onAction; });
  const step = steps[idx];
  const last = idx === steps.length - 1;

  const close = useCallback(() => { setIdx(0); setRect(null); onClose(); }, [onClose]);
  const go = useCallback((d: number) => setIdx((i) => Math.min(steps.length - 1, Math.max(0, i + d))), [steps.length]);

  const measure = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "nearest" });
    const r = el.getBoundingClientRect();
    setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
  }, [step]);

  useEffect(() => {
    if (!open) return;
    act.current(step.action);
    const t1 = setTimeout(measure, 140), t2 = setTimeout(measure, 560);   // measure again after tab / route animations settle
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("resize", measure); };
  }, [open, step, measure]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "Enter") { if (last) close(); else go(1); }
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, last, close, go]);

  if (!open) return null;
  const mobile = vp.w < 768;
  const cardW = Math.min(350, vp.w - 24);
  let pos: CSSProperties;
  if (mobile) pos = { left: 12, right: 12, top: 68 };
  else if (rect && step.where !== "center") {
    const left = rect.x + rect.w + 20 + cardW <= vp.w ? rect.x + rect.w + 20 : Math.max(12, rect.x - cardW - 20);
    pos = { left, top: Math.min(Math.max(rect.y, 12), vp.h - 320), width: cardW };
  } else if (step.where === "map") pos = { left: Math.min(vp.w - cardW - 16, 430), top: vp.h / 2 - 150, width: cardW };
  else pos = { left: vp.w / 2 - cardW / 2, top: vp.h / 2 - 160, width: cardW };

  return (
    <div className="fixed inset-0 z-[1150]" role="dialog" aria-modal="true" aria-label="Map tour">
      {rect ? (
        <motion.div className="absolute rounded-md pointer-events-none" initial={false}
          animate={{ left: rect.x - PAD, top: rect.y - PAD, width: rect.w + PAD * 2, height: rect.h + PAD * 2 }} transition={{ type: "spring", stiffness: 220, damping: 28 }}
          style={{ boxShadow: "0 0 0 9999px rgba(5,12,20,0.74), 0 0 0 2px #d2a35c, 0 0 28px rgba(210,163,92,0.55)" }} />
      ) : <div className="absolute inset-0 bg-[#050c14]/70" />}

      <AnimatePresence mode="wait">
        <motion.div key={step.id} initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="absolute glass rounded-md shadow-2xl p-5" style={pos}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] tracking-wider text-brass-bright">STEP {idx + 1} OF {steps.length}</span>
            <button onClick={close} aria-label="Close tour" className="text-paper/40 hover:text-paper text-lg leading-none">×</button>
          </div>
          <h3 className="font-display text-xl mb-1.5">{step.title}</h3>
          <div className="text-sm text-paper/75 leading-relaxed">{step.body}</div>
          <div className="flex items-center gap-1 mt-4">
            {steps.map((s, i) => <span key={s.id} className="h-1 rounded-full transition-all" style={{ width: i === idx ? 18 : 6, background: i <= idx ? "#d2a35c" : "rgba(231,228,214,0.2)" }} />)}
          </div>
          <div className="flex items-center justify-between mt-4">
            <button onClick={close} className="text-xs text-paper/45 hover:text-paper">{last ? "" : "Skip tour"}</button>
            <div className="flex gap-2">
              {idx > 0 && <button onClick={() => go(-1)} className="btn-ghost !py-1.5">Back</button>}
              <button onClick={() => (last ? close() : go(1))} className="btn-primary !py-1.5">{last ? "Start exploring" : "Next"}</button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
