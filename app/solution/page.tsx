"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { EDGES, HORIZON, PIPELINE, PLATFORM, STATUS, type Edge, type NodeData, type Status } from "@/lib/solution";

/* ---------- world layout (all coordinates in world px) ---------- */
const W = 270;               // card width
const WW = 1500, WH = 1560;  // world size
const MIN_K = 0.2, MAX_K = 2.2;
const COLX = [0, 80, 440, 800, 1160];
const POS: Record<string, { x: number; y: number }> = {};
PIPELINE.forEach((n) => (POS[n.id] = { x: COLX[n.col!], y: 110 + (n.row! - 1) * 220 }));
["api", "web", "deploy"].forEach((id, i) => (POS[id] = { x: 80 + i * 360, y: 935 }));
HORIZON.forEach((n, i) => (POS[n.id] = { x: COLX[i + 1], y: 1310 }));

const REGIONS = [
  ...[["1", "Inputs", "What goes in"], ["2", "Engines", "Predict & check"], ["3", "Solve", "Decide & prove"], ["4", "Outputs", "What you get"]].map(([n, t, s], i) => ({ id: `r${n}`, x: COLX[i + 1] - 20, y: 20, w: W + 40, h: 760, n, t, s, dashed: false })),
  { id: "rp", x: 60, y: 840, w: 1050, h: 290, n: "★", t: "Platform", s: "App, API and delivery", dashed: false },
  { id: "rh", x: 60, y: 1200, w: 1410, h: 330, n: "→", t: "Next horizon", s: "Needs real data; each item names its blocker", dashed: true },
];
const ALL = [...PIPELINE, ...PLATFORM, ...HORIZON];
const BY_ID = Object.fromEntries(ALL.map((n) => [n.id, n])) as Record<string, NodeData>;
const MAP_EDGES: Edge[] = [...EDGES, { from: "api", to: "web" }];
const edgePath = (a: string, b: string) => {
  const x1 = POS[a].x + W, y1 = POS[a].y + 46, x2 = POS[b].x - 6, y2 = POS[b].y + 46, dx = Math.max(30, (x2 - x1) * 0.5);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
};
const edgeStatus = (e: Edge): Status => {
  const a = BY_ID[e.from].status, b = BY_ID[e.to].status;
  return a === "planned" || b === "planned" ? "planned" : a === "progress" || b === "progress" ? "progress" : "built";
};
const estHeight = (n: NodeData) => 128 + (n.stats ? 40 : 0) + n.subs.length * 40 + (n.blocker ? 76 : 0) + 56;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
type Filter = Status | "all";

function Dot({ s, size = 8, pulse = false }: { s: Status; size?: number; pulse?: boolean }) {
  return <span className={`inline-block rounded-full shrink-0 ${pulse ? "animate-pulse" : ""}`} style={{ width: size, height: size, background: STATUS[s].color, boxShadow: `0 0 8px ${STATUS[s].color}88` }} />;
}

/* ---------- node card ---------- */
function NodeCard({ n, selected, ring, dim, compact, filter, openSubs, onSub, onSelect, onHover, delay }: {
  n: NodeData; selected: boolean; ring: boolean; dim: boolean; compact: boolean; filter: Filter; openSubs: Set<string>;
  onSub: (k: string) => void; onSelect: (id: string) => void; onHover: (id: string | null) => void; delay: number;
}) {
  const c = STATUS[n.status].color;
  const p = POS[n.id];
  return (
    <motion.div
      data-card
      initial={{ opacity: 0, y: 40, scale: 0.85 }}
      animate={{ opacity: dim ? 0.22 : 1, y: 0, scale: selected ? 1.02 : 1 }}
      whileHover={{ y: -6, scale: selected ? 1.02 : 1.04 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay }}
      onHoverStart={() => onHover(n.id)} onHoverEnd={() => onHover(null)}
      className={`absolute ${selected ? "z-50" : "z-10 hover:z-20"}`}
      style={{ left: p.x, top: p.y, width: W }}
    >
      {selected && <motion.span key="ripple" initial={{ scale: 0.96, opacity: 0.9 }} animate={{ scale: 1.22, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} className="pointer-events-none absolute inset-0 rounded-sm border-2" style={{ borderColor: c }} />}
      <div className={`spot rounded-sm border bg-ink-raised/95 backdrop-blur-sm transition-[border-color,box-shadow] duration-300 ${selected ? "border-brass" : "rule"}`}
        style={{ borderLeft: `3px solid ${c}`, boxShadow: selected ? `0 0 44px ${c}40, 0 18px 50px rgba(0,0,0,.5)` : ring ? `0 0 28px ${c}55` : "0 6px 20px rgba(0,0,0,.25)" }}>
        <button onClick={() => onSelect(n.id)} aria-expanded={selected} className="w-full text-left px-3.5 py-3 cursor-pointer">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-wider text-paper/45">{n.tag}</span>
            <span className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: c }}><Dot s={n.status} size={6} pulse={n.status === "progress"} />{STATUS[n.status].label}</span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-display leading-tight transition-all ${compact && !selected ? "text-[24px]" : "text-[17px]"}`}>{n.title}</h3>
            <motion.span animate={{ rotate: selected ? 90 : 0 }} className="text-paper/50 text-sm mt-0.5">›</motion.span>
          </div>
          {(!compact || selected) && <p className="text-xs text-paper/60 leading-snug mt-1.5">{n.one}</p>}
          {!compact && !selected && n.subs.length > 0 && (
            <div className="flex items-center gap-1 mt-2.5">{n.subs.map((s, i) => <Dot key={i} s={s.status} size={5} />)}<span className="ml-1 text-[10px] text-paper/35">{n.subs.length} parts · click to open</span></div>
          )}
        </button>

        <AnimatePresence initial={false}>
          {selected && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
              <div className="px-3.5 pb-3.5 space-y-2.5 border-t rule pt-3 cursor-default">
                {n.stats && (
                  <div className="flex flex-wrap gap-1.5">
                    {n.stats.map(([v, l], i) => (
                      <motion.span key={l} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }} className="rounded-sm bg-ink/60 border rule px-2 py-1 text-[11px]"><b className="font-mono text-brass-bright">{v}</b> <span className="text-paper/55">{l}</span></motion.span>
                    ))}
                  </div>
                )}
                {n.subs.map((s, i) => {
                  const k = `${n.id}:${i}`, so = openSubs.has(k), match = filter === "all" || s.status === filter;
                  return (
                    <motion.div key={k} initial={{ opacity: 0, x: -10 }} animate={{ opacity: match ? 1 : 0.3, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="rounded-sm border rule bg-ink/40">
                      <motion.button whileHover={{ x: 3 }} onClick={() => onSub(k)} aria-expanded={so} className="w-full flex items-center gap-2 px-2.5 py-2 text-left">
                        <Dot s={s.status} size={7} />
                        <span className="flex-1 text-[13px] leading-tight">{s.title}</span>
                        <motion.span animate={{ rotate: so ? 90 : 0 }} className="text-paper/40 text-xs">›</motion.span>
                      </motion.button>
                      <AnimatePresence initial={false}>
                        {so && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden px-2.5 text-xs text-paper/65 leading-relaxed">
                            <div className="pb-2.5"><span className="font-mono text-[10px] mr-1.5" style={{ color: STATUS[s.status].color }}>{STATUS[s.status].label.toUpperCase()}</span>{s.text}</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
                {n.blocker && (
                  <div className="text-xs rounded-sm px-2.5 py-2 border" style={{ borderColor: `${STATUS.planned.color}55`, background: `${STATUS.planned.color}12` }}>
                    <b className="text-paper/80">Why not yet: </b><span className="text-paper/65">{n.blocker}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {n.href && <Link href={n.href} className="text-xs text-brass-bright hover:underline">Open page →</Link>}
                  {n.endpoint && <code className="text-[10px]">{n.endpoint}</code>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ---------- minimap ---------- */
function Minimap({ mx, my, mk, vw, vh, onJump }: { mx: MotionValue<number>; my: MotionValue<number>; mk: MotionValue<number>; vw: number; vh: number; onJump: (wx: number, wy: number) => void }) {
  const sc = 150 / WW;
  const rx = useTransform([mx, mk], (v: number[]) => (-v[0] / v[1]) * sc);
  const ry = useTransform([my, mk], (v: number[]) => (-v[0] / v[1]) * sc);
  const rw = useTransform(mk, (k) => (vw / k) * sc);
  const rh = useTransform(mk, (k) => (vh / k) * sc);
  return (
    <svg width={150} height={WH * sc} className="glass rounded-sm cursor-crosshair" aria-label="Minimap"
      onPointerDown={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); onJump((e.clientX - r.left) / sc, (e.clientY - r.top) / sc); }}>
      {REGIONS.map((r) => <rect key={r.id} x={r.x * sc} y={r.y * sc} width={r.w * sc} height={r.h * sc} rx={2} fill="rgba(231,228,214,0.05)" />)}
      {ALL.map((n) => <rect key={n.id} x={POS[n.id].x * sc} y={POS[n.id].y * sc} width={W * sc} height={68 * sc} rx={1} fill={STATUS[n.status].color} opacity={0.85} />)}
      <motion.rect x={rx} y={ry} width={rw} height={rh} fill="rgba(210,163,92,0.12)" stroke="#f4d9a6" strokeWidth={1} />
    </svg>
  );
}

/* ---------- page ---------- */
export default function SolutionPage() {
  const boxRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0), mk = useMotionValue(0.5);
  const tgt = useRef({ x: 0, y: 0, k: 0.5 });
  const anims = useRef<{ stop: () => void }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  const [sel, setSel] = useState<string | null>(null);
  const [hov, setHov] = useState<string | null>(null);
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [compact, setCompact] = useState(false);
  const [hint, setHint] = useState(true);
  const started = useRef(false);
  const reduce = useRef(false);
  const [rm, setRm] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { built: 0, progress: 0, planned: 0 };
    [...PIPELINE, ...PLATFORM].forEach((n) => (n.subs.length ? n.subs.forEach((s) => c[s.status]++) : c[n.status]++));
    HORIZON.forEach((n) => c[n.status]++);
    return c;
  }, []);
  const total = counts.built + counts.progress + counts.planned;

  /* ----- camera ----- */
  const bound = useCallback((x: number, y: number, k: number) => {
    const { w, h } = sizeRef.current;
    return { x: clamp(x, w * 0.15 - WW * k, w * 0.85), y: clamp(y, h * 0.15 - WH * k, h * 0.85), k };
  }, []);
  const glide = useCallback((x: number, y: number, k: number, o?: { instant?: boolean; duration?: number }) => {
    const b = bound(x, y, clamp(k, MIN_K, MAX_K));
    tgt.current = b;
    anims.current.forEach((a) => a.stop());
    if (o?.instant || reduce.current) { mx.set(b.x); my.set(b.y); mk.set(b.k); anims.current = []; return; }
    const t = { duration: o?.duration ?? 0.8, ease: [0.22, 1, 0.36, 1] as const };
    anims.current = [animate(mx, b.x, t), animate(my, b.y, t), animate(mk, b.k, t)];
  }, [bound, mx, my, mk]);
  const zoomAt = useCallback((px: number, py: number, f: number, duration = 0.28) => {
    const t = tgt.current, nk = clamp(t.k * f, MIN_K, MAX_K), r = nk / t.k;
    glide(px - (px - t.x) * r, py - (py - t.y) * r, nk, { duration });
  }, [glide]);
  const viewPipeline = useCallback((instant = false, duration = 1.1) => {
    const { w, h } = sizeRef.current;
    const k = clamp(Math.min((w / WW) * 0.97, (h / 800) * 0.95), MIN_K, 1);
    glide(w / 2 - (WW / 2) * k, h / 2 - 410 * k + 10, k, { instant, duration });
  }, [glide]);
  const viewAll = useCallback(() => {
    const { w, h } = sizeRef.current;
    const k = clamp(Math.min(w / WW, h / WH) * 0.94, MIN_K, 1);
    glide(w / 2 - (WW / 2) * k, h / 2 - (WH / 2) * k, k, { duration: 1 });
  }, [glide]);
  const focusNode = useCallback((id: string) => {
    const { w, h } = sizeRef.current, p = POS[id], eh = estHeight(BY_ID[id]);
    const k = clamp(Math.min(1.15, (h - 150) / eh, (w - 40) / (W + 60)), 0.6, 1.15);
    const cx = p.x + W / 2;
    const fits = eh * k <= h - 150;
    glide(w / 2 - cx * k, fits ? h / 2 + 24 - (p.y + eh / 2) * k : 84 - p.y * k, k, { duration: 0.85 });
  }, [glide]);

  useMotionValueEvent(mk, "change", (v) => { const c = v < 0.62; setCompact((p) => (p === c ? p : c)); });

  /* size + first view */
  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRm(reduce.current);
    const el = boxRef.current!;
    const ro = new ResizeObserver(() => {
      const s = { w: el.clientWidth, h: el.clientHeight };
      sizeRef.current = s; setSize(s);
      if (!started.current && s.w > 0) {
        started.current = true;
        const k0 = clamp(Math.min((s.w / WW) * 0.97, (s.h / 800) * 0.95), MIN_K, 1) * 0.55;
        mk.set(k0); mx.set(s.w / 2 - (WW / 2) * k0); my.set(s.h / 2 - 700 * k0);
        tgt.current = { x: mx.get(), y: my.get(), k: k0 };
        viewPipeline(false, 1.6);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mx, my, mk, viewPipeline]);

  /* wheel zoom (non-passive so the page doesn't scroll) */
  useEffect(() => {
    const el = boxRef.current!;
    const on = (e: WheelEvent) => {
      e.preventDefault(); setHint(false);
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016)), 0.22);
    };
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }, [zoomAt]);

  /* drag to pan, pinch to zoom */
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef({ moved: false, sx: 0, sy: 0, ox: 0, oy: 0, vx: 0, vy: 0, lx: 0, ly: 0, lt: 0, pd: 0 });
  const instantZoom = (px: number, py: number, f: number) => {
    const k0 = mk.get(), nk = clamp(k0 * f, MIN_K, MAX_K), r = nk / k0;
    mx.set(px - (px - mx.get()) * r); my.set(py - (py - my.get()) * r); mk.set(nk);
    tgt.current = { x: mx.get(), y: my.get(), k: nk };
  };
  const onDown = (e: React.PointerEvent) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (ptrs.current.size === 1) {
      anims.current.forEach((a) => a.stop());
      Object.assign(d, { moved: false, sx: e.clientX, sy: e.clientY, ox: mx.get(), oy: my.get(), vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: performance.now() });
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]; d.pd = Math.hypot(a.x - b.x, a.y - b.y); d.moved = true;
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = boxRef.current!.getBoundingClientRect();
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()], nd = Math.hypot(a.x - b.x, a.y - b.y);
      if (d.pd > 0) instantZoom((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, nd / d.pd);
      d.pd = nd; return;
    }
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 5) { d.moved = true; setHint(false); boxRef.current!.setPointerCapture(e.pointerId); }
    if (!d.moved) return;
    const b = bound(d.ox + dx, d.oy + dy, mk.get());
    mx.set(b.x); my.set(b.y); tgt.current = b;
    const now = performance.now(), dt = Math.max(1, now - d.lt);
    d.vx = (e.clientX - d.lx) / dt; d.vy = (e.clientY - d.ly) / dt; d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
  };
  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId);
    const d = drag.current;
    if (ptrs.current.size === 1) { const [p] = [...ptrs.current.values()]; Object.assign(d, { sx: p.x, sy: p.y, ox: mx.get(), oy: my.get(), pd: 0 }); }
    if (ptrs.current.size === 0 && d.moved && performance.now() - d.lt < 80 && Math.hypot(d.vx, d.vy) > 0.25)
      glide(mx.get() + d.vx * 260, my.get() + d.vy * 260, mk.get(), { duration: 0.8 }); // inertia
  };

  /* selection */
  const select = useCallback((id: string | null) => {
    setHint(false);
    setSel((cur) => { const next = id === cur ? null : id; if (next) focusNode(next); return next; });
  }, [focusNode]);
  const onSub = (k: string) => setOpenSubs((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const onKey = (e: React.KeyboardEvent) => {
    const { w, h } = sizeRef.current, t = tgt.current, step = 80;
    if (e.key === "+" || e.key === "=") zoomAt(w / 2, h / 2, 1.3);
    else if (e.key === "-" || e.key === "_") zoomAt(w / 2, h / 2, 1 / 1.3);
    else if (e.key === "0") viewPipeline();
    else if (e.key === "Escape") setSel(null);
    else if (e.key === "ArrowLeft") glide(t.x + step, t.y, t.k, { duration: 0.3 });
    else if (e.key === "ArrowRight") glide(t.x - step, t.y, t.k, { duration: 0.3 });
    else if (e.key === "ArrowUp") glide(t.x, t.y + step, t.k, { duration: 0.3 });
    else if (e.key === "ArrowDown") glide(t.x, t.y - step, t.k, { duration: 0.3 });
  };

  /* highlighting */
  const focus = sel ?? hov;
  const related = useMemo(() => {
    const s = new Set<string>();
    if (focus) MAP_EDGES.forEach((e) => { if (e.from === focus) s.add(e.to); if (e.to === focus) s.add(e.from); });
    return s;
  }, [focus]);
  const dimmed = (n: NodeData) => {
    if (filter !== "all" && n.status !== filter && !n.subs.some((s) => s.status === filter)) return true;
    return !!sel && n.id !== sel && !related.has(n.id);
  };

  const bgPos = useTransform([mx, my], (v: number[]) => `${v[0]}px ${v[1]}px`);
  const bgSize = useTransform(mk, (k) => `${36 * k}px ${36 * k}px`);
  const pct = useTransform(mk, (k) => `${Math.round(k * 100)}%`);

  return (
    <div className="relative w-full h-[calc(100vh-61px)] min-h-[520px] overflow-hidden select-none">
      <div
        ref={boxRef} tabIndex={0} role="application" aria-label="Interactive solution map. Drag to pan, scroll to zoom, click a box to open it."
        className="absolute inset-0 outline-none cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}
        onClickCapture={(e) => { if (drag.current.moved) { e.stopPropagation(); e.preventDefault(); drag.current.moved = false; } }}
        onClick={(e) => { if (!(e.target as HTMLElement).closest("[data-card]")) setSel(null); }}
        onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest("[data-card]")) { const r = boxRef.current!.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, 1.7, 0.5); } }}
      >
        {/* parallax dot grid */}
        <motion.div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(231,228,214,0.13) 1.2px, transparent 1.4px)", backgroundSize: bgSize, backgroundPosition: bgPos }} />

        <motion.div className="absolute left-0 top-0" style={{ x: mx, y: my, scale: mk, originX: 0, originY: 0, width: WW, height: WH }}>
          {/* regions */}
          {REGIONS.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * i, duration: 0.7 }} className="absolute rounded-md pointer-events-none"
              style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: "linear-gradient(180deg, rgba(231,228,214,0.045), rgba(231,228,214,0.015))", border: `1px ${r.dashed ? "dashed" : "solid"} rgba(231,228,214,${r.dashed ? 0.2 : 0.1})` }}>
              <div className="px-4 pt-3 flex items-baseline gap-2"><span className="font-mono text-xs text-brass-bright">{r.n}</span><span className="font-display text-xl">{r.t}</span><span className="text-[11px] text-paper/45">{r.s}</span></div>
            </motion.div>
          ))}
          <div className="absolute font-mono text-[11px] pointer-events-none" style={{ left: 60, top: 796, color: STATUS.built.color }}>↓ served by the platform</div>
          <div className="absolute font-mono text-[11px] pointer-events-none" style={{ left: 60, top: 1160, color: STATUS.planned.color }}>↓ extends into</div>

          {/* connections */}
          <svg className="absolute left-0 top-0 pointer-events-none z-[1]" width={WW} height={WH} style={{ overflow: "visible" }} aria-hidden>
            <defs>{(["built", "progress", "planned"] as Status[]).map((s) => <marker key={s} id={`m-${s}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={STATUS[s].color} /></marker>)}</defs>
            {MAP_EDGES.map((e, i) => {
              const st = edgeStatus(e), c = STATUS[st].color, d = edgePath(e.from, e.to);
              const hi = focus === e.from || focus === e.to;
              const faded = !!sel && !hi;
              return (
                <g key={`${e.from}>${e.to}`} opacity={faded ? 0.12 : 1} style={{ transition: "opacity .3s" }}>
                  <motion.path d={d} fill="none" stroke={c} strokeLinecap="round" markerEnd={`url(#m-${st})`} className={hi ? "route-flow" : ""}
                    strokeDasharray={hi ? "10 8" : st === "planned" ? "3 6" : undefined}
                    initial={{ opacity: 0 }} animate={{ opacity: hi ? 1 : 0.4, strokeWidth: hi ? 2.8 : 1.4 }} transition={{ duration: 0.3, delay: hi ? 0 : 0.9 }} />
                  {!rm && (
                    <circle r={hi ? 3.4 : 2.2} fill={c} opacity={hi ? 1 : 0.7}>
                      <animateMotion dur={`${hi ? 1.5 : 3.8 + (i % 4) * 0.5}s`} begin={`${(i * 0.43) % 2.4}s`} repeatCount="indefinite" path={d} />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {ALL.map((n, i) => (
            <NodeCard key={n.id} n={n} selected={sel === n.id} ring={!!focus && related.has(n.id)} dim={dimmed(n)} compact={compact} filter={filter}
              openSubs={openSubs} onSub={onSub} onSelect={select} onHover={setHov} delay={0.35 + i * 0.045} />
          ))}
        </motion.div>
      </div>

      {/* top-left: title + status filters */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="absolute top-3 left-3 right-3 sm:right-auto z-[60] glass rounded-sm px-3.5 py-2.5 max-w-full">
        <div className="flex items-baseline gap-2 mb-2"><span className="font-display text-lg">Solution map</span><span className="text-[11px] text-paper/45 hidden sm:inline">Drag · scroll to zoom · click a box</span></div>
        <div className="flex h-1.5 rounded-full overflow-hidden mb-2 bg-paper/10">
          {(["built", "progress", "planned"] as Status[]).map((s) => <motion.div key={s} initial={{ width: 0 }} animate={{ width: `${(counts[s] / total) * 100}%` }} transition={{ duration: 1, delay: 0.5 }} style={{ background: STATUS[s].color }} />)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setFilter("all")} className={`chip ${filter === "all" ? "chip-brass" : ""}`}>All · {total}</button>
          {(["built", "progress", "planned"] as Status[]).map((s) => (
            <button key={s} onClick={() => setFilter(filter === s ? "all" : s)} title={STATUS[s].blurb} className={`chip flex items-center gap-1.5 ${filter === s ? "chip-brass" : ""}`}><Dot s={s} size={6} />{STATUS[s].label} · {counts[s]}</button>
          ))}
        </div>
      </motion.div>

      {/* bottom-left: hint */}
      <AnimatePresence>
        {hint && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ delay: 1.2 }} className="absolute bottom-4 left-3 z-[60] glass rounded-sm px-3 py-2 text-[11px] text-paper/70 pointer-events-none max-w-[260px]">
            <b className="text-brass-bright">Tip:</b> zoom in for detail, zoom out for the big picture. Double-click empty space to zoom in. <b>In progress</b> = built but not fully verified, or a known gap.
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom-right: controls + minimap */}
      <div className="absolute bottom-4 right-3 z-[60] flex items-end gap-3" onPointerDown={(e) => e.stopPropagation()}>
        <div className="glass rounded-sm flex flex-col overflow-hidden text-center">
          <button aria-label="Zoom in" className="px-3 py-2 hover:bg-paper/10 text-lg leading-none" onClick={() => zoomAt(size.w / 2, size.h / 2, 1.4, 0.35)}>+</button>
          <motion.span className="px-2 py-1 font-mono text-[10px] text-paper/50 border-y rule">{pct}</motion.span>
          <button aria-label="Zoom out" className="px-3 py-2 hover:bg-paper/10 text-lg leading-none" onClick={() => zoomAt(size.w / 2, size.h / 2, 1 / 1.4, 0.35)}>−</button>
          <button aria-label="Pipeline view" title="Pipeline view" className="px-3 py-2 hover:bg-paper/10 border-t rule text-sm" onClick={() => viewPipeline()}>⌂</button>
          <button aria-label="Fit everything" title="Fit everything" className="px-3 py-2 hover:bg-paper/10 border-t rule text-sm" onClick={viewAll}>⤢</button>
        </div>
        <div className="hidden sm:block">
          <Minimap mx={mx} my={my} mk={mk} vw={size.w} vh={size.h} onJump={(wx, wy) => glide(size.w / 2 - wx * tgt.current.k, size.h / 2 - wy * tgt.current.k, tgt.current.k, { duration: 0.6 })} />
        </div>
      </div>
    </div>
  );
}
