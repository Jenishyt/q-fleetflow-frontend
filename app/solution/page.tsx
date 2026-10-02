"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { COLS, EDGES, HORIZON, PIPELINE, PLATFORM, STATUS, type NodeData, type Status } from "@/lib/solution";

// full class strings so Tailwind can see them
const COL_CLS = ["", "lg:col-start-1", "lg:col-start-2", "lg:col-start-3", "lg:col-start-4"];
const ROW_CLS = ["", "lg:row-start-2", "lg:row-start-3", "lg:row-start-4"];
type Filter = Status | "all";
interface PathInfo { id: string; from: string; to: string; d: string; color: string; dashed: boolean }

const ALL_NODES = [...PIPELINE, ...PLATFORM, ...HORIZON];
const STATUS_OF = Object.fromEntries(ALL_NODES.map((n) => [n.id, n.status])) as Record<string, Status>;

function Dot({ s, size = 8 }: { s: Status; size?: number }) {
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: STATUS[s].color, boxShadow: `0 0 8px ${STATUS[s].color}88` }} />;
}

function Card({ n, open, onToggle, openSubs, onSub, dim, filter, hover, reg, delay, place }: {
  n: NodeData; open: boolean; onToggle: () => void; openSubs: Set<string>; onSub: (k: string) => void;
  dim: boolean; filter: Filter; hover: (id: string | null) => void; reg: (id: string, el: HTMLDivElement | null) => void; delay: number; place?: string;
}) {
  const c = STATUS[n.status].color;
  return (
    <motion.div
      ref={(el) => { reg(n.id, el); }}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: dim ? 0.28 : 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => hover(n.id)} onMouseLeave={() => hover(null)}
      className={`relative z-10 self-start rounded-sm border bg-ink-raised transition-shadow ${place ?? ""} ${open ? "border-brass shadow-[0_0_30px_rgba(210,163,92,0.18)]" : "rule hover:border-paper/40"}`}
      style={{ borderLeft: `3px solid ${c}` }}
    >
      <button onClick={onToggle} aria-expanded={open} className="w-full text-left px-3.5 py-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-mono text-[10px] tracking-wider text-paper/45">{n.tag}</span>
          <span className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: c }}><Dot s={n.status} size={6} />{STATUS[n.status].label}</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[17px] leading-tight">{n.title}</h3>
          <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-paper/50 text-sm mt-0.5">›</motion.span>
        </div>
        <p className="text-xs text-paper/60 leading-snug mt-1.5">{n.one}</p>
        {!open && n.subs.length > 0 && (
          <div className="flex gap-1 mt-2.5">{n.subs.map((s, i) => <Dot key={i} s={s.status} size={5} />)}<span className="ml-1 text-[10px] text-paper/35">{n.subs.length} parts</span></div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
            <div className="px-3.5 pb-3.5 space-y-2.5 border-t rule pt-3">
              {n.stats && (
                <div className="flex flex-wrap gap-1.5">
                  {n.stats.map(([v, l]) => (
                    <span key={l} className="rounded-sm bg-ink/60 border rule px-2 py-1 text-[11px]"><b className="font-mono text-brass-bright">{v}</b> <span className="text-paper/55">{l}</span></span>
                  ))}
                </div>
              )}
              {n.subs.map((s, i) => {
                const k = `${n.id}:${i}`, so = openSubs.has(k), match = filter === "all" || s.status === filter;
                return (
                  <div key={k} className={`rounded-sm border rule bg-ink/40 transition-opacity ${match ? "" : "opacity-30"}`}>
                    <button onClick={() => onSub(k)} aria-expanded={so} className="w-full flex items-center gap-2 px-2.5 py-2 text-left">
                      <Dot s={s.status} size={7} />
                      <span className="flex-1 text-[13px] leading-tight">{s.title}</span>
                      <motion.span animate={{ rotate: so ? 90 : 0 }} className="text-paper/40 text-xs">›</motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {so && (
                        <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                          className="overflow-hidden px-2.5 text-xs text-paper/65 leading-relaxed">
                          <span className="block pb-2.5"><span className="font-mono text-[10px] mr-1.5" style={{ color: STATUS[s.status].color }}>{STATUS[s.status].label.toUpperCase()}</span>{s.text}</span>
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {n.blocker && (
                <div className="text-xs rounded-sm px-2.5 py-2 border" style={{ borderColor: `${STATUS.planned.color}55`, background: `${STATUS.planned.color}12` }}>
                  <b className="text-paper/80">Why not yet: </b><span className="text-paper/65">{n.blocker}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
                {n.href && <Link href={n.href} className="text-xs text-brass-bright hover:underline">Open page →</Link>}
                {n.endpoint && <code className="text-[10px]">{n.endpoint}</code>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SolutionPage() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [paths, setPaths] = useState<PathInfo[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const ro = useRef<ResizeObserver | null>(null);
  const raf = useRef(0);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { built: 0, progress: 0, planned: 0 };
    [...PIPELINE, ...PLATFORM].forEach((n) => (n.subs.length ? n.subs.forEach((s) => c[s.status]++) : c[n.status]++));
    HORIZON.forEach((n) => c[n.status]++);
    return c;
  }, []);
  const total = counts.built + counts.progress + counts.planned;

  const measure = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const wrap = wrapRef.current;
      if (!wrap || !window.matchMedia("(min-width: 1024px)").matches) { setPaths([]); return; }
      const cr = wrap.getBoundingClientRect();
      const out: PathInfo[] = [];
      for (const e of EDGES) {
        const a = refs.current[e.from], b = refs.current[e.to];
        if (!a || !b) continue;
        const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
        const x1 = ar.right - cr.left, y1 = ar.top - cr.top + Math.min(ar.height / 2, 44);
        const x2 = br.left - cr.left - 6, y2 = br.top - cr.top + Math.min(br.height / 2, 44);
        if (x2 <= x1 + 8) continue;
        const dx = Math.max(24, (x2 - x1) * 0.5);
        const sa = STATUS_OF[e.from], sb = STATUS_OF[e.to];
        const worst: Status = sa === "planned" || sb === "planned" ? "planned" : sa === "progress" || sb === "progress" ? "progress" : "built";
        out.push({ id: `${e.from}>${e.to}`, from: e.from, to: e.to, d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, color: STATUS[worst].color, dashed: worst === "planned" });
      }
      setPaths(out);
    });
  }, []);

  // one observer watches the container and every card (expanding a card moves its neighbours' anchors)
  useEffect(() => {
    ro.current = new ResizeObserver(measure);
    if (wrapRef.current) ro.current.observe(wrapRef.current);
    Object.values(refs.current).forEach((el) => el && ro.current?.observe(el));
    window.addEventListener("resize", measure);
    measure();
    const t = setTimeout(measure, 900); // after entrance animation settles
    return () => { ro.current?.disconnect(); window.removeEventListener("resize", measure); clearTimeout(t); cancelAnimationFrame(raf.current); };
  }, [measure]);

  const reg = useCallback((id: string, el: HTMLDivElement | null) => {
    const prev = refs.current[id];
    if (prev && prev !== el) ro.current?.unobserve(prev);
    refs.current[id] = el;
    if (el) ro.current?.observe(el);
  }, []);

  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSub = (k: string) => setOpenSubs((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const allOpen = open.size === ALL_NODES.length;
  const expandAll = () => {
    if (allOpen) { setOpen(new Set()); setOpenSubs(new Set()); }
    else setOpen(new Set(ALL_NODES.map((n) => n.id)));
  };

  const active = useMemo(() => { const s = new Set(open); if (hoverId) s.add(hoverId); return s; }, [open, hoverId]);
  const dimmed = (n: NodeData) => filter !== "all" && n.status !== filter && !n.subs.some((s) => s.status === filter);

  const cardProps = (n: NodeData, delay: number, place?: string) => ({
    n, open: open.has(n.id), onToggle: () => toggle(n.id), openSubs, onSub: toggleSub, dim: dimmed(n), filter, hover: setHoverId, reg, delay, place,
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-brass-bright mb-3">Complete solution</motion.p>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl md:text-4xl mb-2">From voyage data to a compliant fleet plan.</motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-paper/65 text-sm max-w-2xl mb-6">
        Read left to right. <b className="text-paper/85">Click any box</b> to open it, then click a part inside for details. Lines show how information flows; they light up for whatever you open or hover.
      </motion.p>

      {/* progress + filters */}
      <div className="border rule rounded-sm bg-ink-raised/70 p-4 mb-8">
        <div className="flex h-2.5 rounded-full overflow-hidden mb-3 bg-paper/10">
          {(["built", "progress", "planned"] as Status[]).map((s) => (
            <motion.div key={s} initial={{ width: 0 }} animate={{ width: `${(counts[s] / total) * 100}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }} style={{ background: STATUS[s].color }} title={`${STATUS[s].label}: ${counts[s]}`} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setFilter("all")} className={`chip ${filter === "all" ? "chip-brass" : ""}`}>All · {total}</button>
          {(["built", "progress", "planned"] as Status[]).map((s) => (
            <button key={s} onClick={() => setFilter(filter === s ? "all" : s)} className={`chip flex items-center gap-1.5 ${filter === s ? "chip-brass" : ""}`} title={STATUS[s].blurb}>
              <Dot s={s} size={6} />{STATUS[s].label} · {counts[s]}
            </button>
          ))}
          <span className="hidden md:inline text-[11px] text-paper/40 ml-1">{filter === "all" ? "Counts are individual features, not boxes. Click a status to spotlight it." : STATUS[filter].blurb}</span>
          <button onClick={expandAll} className="chip ml-auto">{allOpen ? "Collapse all" : "Expand all"}</button>
        </div>
      </div>

      {/* pipeline */}
      <div ref={wrapRef} className="relative grid grid-cols-1 lg:grid-cols-4 gap-x-14 gap-y-4 lg:gap-y-5">
        <svg className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden>
          <defs>
            {(["built", "progress", "planned"] as Status[]).map((s) => (
              <marker key={s} id={`ah-${s}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={STATUS[s].color} /></marker>
            ))}
          </defs>
          {paths.map((p) => {
            const hi = active.has(p.from) || active.has(p.to);
            const mk = p.color === STATUS.planned.color ? "planned" : p.color === STATUS.progress.color ? "progress" : "built";
            return (
              <motion.path key={p.id} d={p.d} fill="none" stroke={p.color} strokeLinecap="round" markerEnd={`url(#ah-${mk})`}
                className={hi ? "route-flow" : ""}
                strokeDasharray={hi ? "10 8" : p.dashed ? "3 6" : undefined}
                initial={{ opacity: 0 }} animate={{ opacity: hi ? 1 : 0.35, strokeWidth: hi ? 2.4 : 1.3 }} transition={{ duration: 0.25, delay: hi ? 0 : 0.9 }} />
            );
          })}
        </svg>

        {COLS.map((c) => (
          <div key={c.n} className={`${COL_CLS[c.n]} lg:row-start-1 pt-4 lg:pt-0 pb-1 flex items-baseline gap-2 border-b rule`}>
            <span className="font-mono text-[11px] text-brass-bright">{c.n}</span>
            <span className="font-display text-lg">{c.title}</span>
            <span className="text-[11px] text-paper/45">{c.sub}</span>
          </div>
        ))}
        {PIPELINE.map((n) => (
          // DOM order = column then row, so it reads top-to-bottom on phones
          <Card key={n.id} {...cardProps(n, 0.1 * n.col! + 0.06 * n.row!, `${COL_CLS[n.col!]} ${ROW_CLS[n.row!]}`)} />
        ))}
      </div>

      {/* platform */}
      <div className="mt-14">
        <h2 className="font-display text-xl mb-1">The platform underneath</h2>
        <p className="text-xs text-paper/50 mb-4">The app, the API and how it&apos;s delivered.</p>
        <div className="grid md:grid-cols-3 gap-5">
          {PLATFORM.map((n, i) => <Card key={n.id} {...cardProps(n, 0.1 * i)} />)}
        </div>
      </div>

      {/* horizon */}
      <div className="mt-14">
        <div className="flex items-center gap-3 mb-1">
          <motion.span animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.8 }} className="text-planned" style={{ color: STATUS.planned.color }}>↓</motion.span>
          <h2 className="font-display text-xl">Next horizon: what needs real data</h2>
        </div>
        <p className="text-xs text-paper/50 mb-4">Each item names its real blocker. We would rather show the plan than fake the feature.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {HORIZON.map((n, i) => <Card key={n.id} {...cardProps(n, 0.08 * i)} />)}
        </div>
      </div>

      <p className="mt-12 text-[11px] text-paper/40 max-w-3xl">
        Statuses reflect what has actually been tested. <b>In progress</b> means built but not fully verified, or a known gap we are tracking. Sea-lane geometry and risk zones are planning-grade approximations, not navigation data.
      </p>
    </div>
  );
}
