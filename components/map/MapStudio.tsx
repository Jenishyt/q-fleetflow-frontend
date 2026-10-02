"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { api, type Port, type RouteGeometry } from "@/lib/api";
import { mergePorts } from "@/lib/sea/ports";
import { findRoute, type RouteOptions, type SeaRoute } from "@/lib/sea/router";
import {
  CF_TTW, DESIGN_SPEED, FUELS, VESSEL_CLASSES, estimateVoyage, physicsFuelTPerDay,
  type Fuel, type VesselClass, type VoyageParams,
} from "@/lib/sea/voyage";
import AnimatedNumber from "@/components/AnimatedNumber";
import { useToast } from "@/components/Toast";
import { BASE_LAYERS, DEFAULT_LAYERS, MAPTILER_KEY, OWM_KEY, OWM_LAYERS, type LayerState } from "./layers";
import type { Pin } from "./MapCanvas";

const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false });

// Same three routes as backend configs/scenario.yaml, used when the API is not reachable.
const FALLBACK_SCENARIO: { name: string; from: string; to: string; distance_nm: number }[] = [
  { name: "R1_coastal_main", from: "INMAA", to: "LKCMB", distance_nm: 500 },
  { name: "R2_long_haul", from: "INMAA", to: "SGSIN", distance_nm: 800 },
  { name: "R3_short_feeder", from: "INMAA", to: "INCOK", distance_nm: 350 },
];
const PRESETS = [
  { label: "Mumbai → Rotterdam", from: "INBOM", to: "NLRTM" },
  { label: "Singapore → Rotterdam", from: "SGSIN", to: "NLRTM" },
  { label: "Shanghai → Los Angeles", from: "CNSHA", to: "USLAX" },
  { label: "Jebel Ali → Singapore", from: "AEJEA", to: "SGSIN" },
];
const PIN_COLORS = ["#6fd08c", "#7fb8ff", "#e58bd0", "#ffb86b"];
const fmt = (n: number, d = 0) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const usd = (n: number) => `$${fmt(n)}`;

type Tab = "plan" | "compare" | "layers";

/* ---------- small UI atoms ---------- */
function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="w-full flex items-center justify-between gap-3 py-2 text-left group">
      <span>
        <span className="block text-sm text-paper/90 group-hover:text-paper">{label}</span>
        {hint && <span className="block text-[11px] text-paper/45">{hint}</span>}
      </span>
      <span className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${on ? "bg-brass" : "bg-paper/15"}`}>
        <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 32 }}
          className="absolute top-0.5 w-4 h-4 rounded-full bg-paper" style={{ left: on ? 18 : 2 }} />
      </span>
    </button>
  );
}

function PortPicker({ label, value, ports, onPick, accent, exclude }: {
  label: string; value: Port | null; ports: Port[]; onPick: (p: Port | null) => void; accent: string; exclude?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ports.filter((p) => p.locode !== exclude && (!s || p.name.toLowerCase().includes(s) || p.country.toLowerCase().includes(s) || p.locode.toLowerCase().includes(s))).slice(0, 8);
  }, [q, ports, exclude]);

  return (
    <div className="relative">
      <label className="block font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: accent }}>{label}</label>
      <div className="relative">
        <input
          value={open ? q : value ? `${value.name} (${value.locode})` : ""}
          placeholder="Search port, country or UN/LOCODE…"
          onFocus={() => { setOpen(true); setQ(""); }}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          onChange={(e) => { setQ(e.target.value); setHi(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            if (e.key === "Enter" && list[hi]) { onPick(list[hi]); setOpen(false); (e.target as HTMLInputElement).blur(); }
            if (e.key === "Escape") (e.target as HTMLInputElement).blur();
          }}
          className="w-full bg-ink/60 border rule rounded-sm pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-brass transition-colors"
        />
        {value && (
          <button aria-label={`Clear ${label}`} onMouseDown={(e) => { e.preventDefault(); onPick(null); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-paper/40 hover:text-paper text-sm">×</button>
        )}
      </div>
      <AnimatePresence>
        {open && list.length > 0 && (
          <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute z-30 left-0 right-0 mt-1 glass border rule rounded-sm overflow-hidden shadow-2xl">
            {list.map((p, i) => (
              <li key={p.locode}>
                <button onMouseDown={(e) => { e.preventDefault(); onPick(p); setOpen(false); }} onMouseEnter={() => setHi(i)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${i === hi ? "bg-paper/10" : ""}`}>
                  <span>{p.name} <span className="text-paper/45">· {p.country}</span></span>
                  <span className="font-mono text-[10px] text-brass-bright">{p.locode}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-sm border rule bg-ink/40 px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-paper/45">{label}</div>
      <div className="font-display text-xl leading-tight mt-0.5">{children}</div>
      {sub && <div className="text-[10px] text-paper/40 mt-0.5">{sub}</div>}
    </div>
  );
}

/** Read shareable state from the URL once (this component only ever renders in the browser). */
function readQuery() {
  const q = new URLSearchParams(window.location.search);
  const all = mergePorts(null);
  const fu = q.get("fuel") as Fuel, vc = q.get("class") as VesselClass, sp = Number(q.get("speed"));
  return {
    origin: all.find((p) => p.locode === q.get("from")) ?? null,
    dest: all.find((p) => p.locode === q.get("to")) ?? null,
    speed: sp >= 6 && sp <= 30 ? sp : 16,
    fuel: FUELS.includes(fu) ? fu : ("VLSFO" as Fuel),
    vesselClass: VESSEL_CLASSES.includes(vc) ? vc : ("container" as VesselClass),
    opts: { avoidSuez: q.get("nosuez") === "1" || undefined, avoidRedSea: q.get("noredsea") === "1" || undefined } as RouteOptions,
  };
}

/* ---------- main ---------- */
export default function MapStudio() {
  const { toast } = useToast();
  const [ports, setPorts] = useState<Port[]>(() => mergePorts(null));
  const [backend, setBackend] = useState<"checking" | "online" | "offline">("checking");
  const [scenario, setScenario] = useState<RouteGeometry[] | null>(null);

  const [init] = useState(readQuery);
  const [origin, setOrigin] = useState<Port | null>(init.origin);
  const [dest, setDest] = useState<Port | null>(init.dest);
  const [opts, setOpts] = useState<RouteOptions>(init.opts);
  const [vesselClass, setVesselClass] = useState<VesselClass>(init.vesselClass);
  const [fuel, setFuel] = useState<Fuel>(init.fuel);
  const [speed, setSpeed] = useState(init.speed);
  const [rate, setRate] = useState<{ tPerDay: number; source: VoyageParams["source"] }>({ tPerDay: physicsFuelTPerDay(init.vesselClass, init.speed), source: "physics-fallback" });

  const [tab, setTab] = useState<Tab>("plan");
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [pins, setPins] = useState<Pin[]>([]);
  const [pinParams, setPinParams] = useState<Record<string, VoyageParams>>({});
  const [fitSignal, setFitSignal] = useState(0);
  const [radarUrl, setRadarUrl] = useState<string | null>(null);
  const [replayRaw, setReplay] = useState<{ on: boolean; playing: boolean; t: number; mult: number; rk: string }>({ on: false, playing: false, t: 0, mult: 1, rk: "" });
  const [collapsed, setCollapsed] = useState(false);

  /* load backend data (optional - map works offline) */
  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.ports(), api.routes()]).then(([p, r]) => {
      if (!alive) return;
      if (p.status === "fulfilled") setPorts(mergePorts(p.value.ports));
      if (r.status === "fulfilled") setScenario(r.value.routes);
      setBackend(p.status === "fulfilled" || r.status === "fulfilled" ? "online" : "offline");
    });
    return () => { alive = false; };
  }, []);

  /* keep the URL shareable */
  useEffect(() => {
    const q = new URLSearchParams();
    if (origin) q.set("from", origin.locode);
    if (dest) q.set("to", dest.locode);
    if (origin && dest) { q.set("speed", String(speed)); q.set("fuel", fuel); q.set("class", vesselClass); }
    if (opts.avoidSuez) q.set("nosuez", "1");
    if (opts.avoidRedSea) q.set("noredsea", "1");
    const s = q.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [origin, dest, speed, fuel, vesselClass, opts]);

  /* radar overlay (RainViewer, no key) - only fetched when the layer is switched on */
  useEffect(() => {
    if (!layers.radar || radarUrl) return;
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => r.json())
      .then((j) => {
        const frame = j?.radar?.past?.at(-1);
        if (frame?.path && j.host) setRadarUrl(`${j.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`);
        else throw new Error("no frames");
      })
      .catch(() => { toast("Radar layer unavailable right now", "error"); setLayers((l) => ({ ...l, radar: false })); });
  }, [layers.radar, radarUrl, toast]);

  /* routing is pure + instant (client-side Dijkstra over the validated lane graph) */
  const route: SeaRoute | null = useMemo(() => (origin && dest ? findRoute(origin, dest, opts) : null), [origin, dest, opts]);
  useEffect(() => { if (origin && dest && !route) toast("No sea route found with these restrictions", "error"); }, [origin, dest, route, toast]);

  /* fuel burn from the real model when the backend is up, physics prior otherwise */
  useEffect(() => {
    let alive = true;
    const h = setTimeout(() => {
      api.predict({ vessel_class: vesselClass, speed_kn: speed, draft_ratio: 0.75, fuel_type: fuel })
        .then((r) => alive && setRate({ tPerDay: r.fuel_t_per_day, source: "backend" }))
        .catch(() => alive && setRate({ tPerDay: physicsFuelTPerDay(vesselClass, speed), source: "physics-fallback" }));
    }, 250);
    return () => { alive = false; clearTimeout(h); };
  }, [vesselClass, fuel, speed]);

  const params: VoyageParams = useMemo(() => ({ vesselClass, fuel, speedKn: speed, fuelTPerDay: rate.tPerDay, source: rate.source }), [vesselClass, fuel, speed, rate]);
  const est = useMemo(() => (route ? estimateVoyage(route, params) : null), [route, params]);

  /* a replay belongs to the route it was started on; changing route implicitly ends it */
  const routeKey = route ? `${route.from.locode}>${route.to.locode}:${route.nodeIds.length}` : "";
  const replay = replayRaw.rk === routeKey ? replayRaw : { ...replayRaw, on: false, playing: false, t: 0 };

  /* replay loop */
  useEffect(() => {
    if (!replay.on || !replay.playing) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      setReplay((r) => (r.t >= 1 ? { ...r, playing: false, t: 1 } : { ...r, t: Math.min(1, r.t + (dt * r.mult) / 22) }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [replay.on, replay.playing]);

  /* actions */
  const pickPort = useCallback((p: Port) => {
    if (!origin) { setOrigin(p); toast(`Origin: ${p.name}`, "info"); }
    else if (!dest && p.locode !== origin.locode) { setDest(p); toast(`Destination: ${p.name}`, "info"); }
  }, [origin, dest, toast]);
  const byCode = useCallback((c: string) => ports.find((p) => p.locode === c) ?? null, [ports]);
  const loadOD = (a: string, b: string) => { const A = byCode(a), B = byCode(b); if (A && B) { setOrigin(A); setDest(B); setTab("plan"); } };
  const swap = () => { setOrigin(dest); setDest(origin); };
  const clearAll = () => { setOrigin(null); setDest(null); setReplay({ on: false, playing: false, t: 0, mult: 1, rk: "" }); };

  const pinRoute = (r: SeaRoute, label: string, p: VoyageParams) => {
    if (pins.length >= 4) { toast("Compare holds up to 4 routes — remove one first", "error"); return; }
    const id = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
    setPins((x) => [...x, { id, label, color: PIN_COLORS[x.length % PIN_COLORS.length], route: r }]);
    setPinParams((m) => ({ ...m, [id]: p }));
    toast(`Pinned “${label}” to Compare`, "success");
  };
  const unpin = (id: string) => setPins((x) => x.filter((p) => p.id !== id));
  const label = (r: SeaRoute) => `${r.from.name.split(" (")[0]} → ${r.to.name.split(" (")[0]}${r.options.avoidSuez ? " (no Suez)" : r.options.avoidRedSea ? " (no Red Sea)" : r.viaSuez ? " (via Suez)" : ""}`;

  const compareSuez = () => {
    if (!origin || !dest) return;
    const a = findRoute(origin, dest, {});
    const b = findRoute(origin, dest, { avoidSuez: true });
    if (!a || !b) return;
    if (a.nodeIds.join() === b.nodeIds.join()) { toast("This pair doesn't use the Suez Canal — nothing to compare", "info"); return; }
    setPins([]); setPinParams({});
    const mk = (r: SeaRoute, i: number) => {
      const id = `suez${i}${Date.now()}`;
      setPins((x) => [...x, { id, label: label(r), color: PIN_COLORS[i], route: r }]);
      setPinParams((m) => ({ ...m, [id]: params }));
    };
    mk(a, 0); mk(b, 1); setTab("compare");
  };

  const scenarioRows = useMemo(() => {
    if (scenario) return scenario.filter((r) => r.origin && r.destination).map((r) => ({ name: r.name, from: r.origin!.locode, to: r.destination!.locode, distance_nm: r.distance_nm }));
    return FALLBACK_SCENARIO;
  }, [scenario]);

  const copyGeoJSON = () => {
    if (!route || !est) return;
    const gj = { type: "Feature", properties: { from: route.from.name, to: route.to.name, distance_nm: Math.round(route.distanceNm), days: +est.days.toFixed(1), chokepoints: route.chokepoints },
      geometry: { type: "LineString", coordinates: route.path } };
    navigator.clipboard.writeText(JSON.stringify(gj)).then(() => toast("Route GeoJSON copied", "success"), () => toast("Clipboard blocked by the browser", "error"));
  };

  const scenarioMatch = route && scenarioRows.find((s) => s.from === route.from.locode && s.to === route.to.locode);
  const best = useMemo(() => {
    if (pins.length < 2) return null;
    const rows = pins.map((p) => ({ id: p.id, e: estimateVoyage(p.route, pinParams[p.id] ?? params) }));
    const min = (k: "days" | "co2T" | "totalUsd") => rows.reduce((a, b) => (b.e[k] < a.e[k] ? b : a)).id;
    return { dist: pins.reduce((a, b) => (b.route.distanceNm < a.route.distanceNm ? b : a)).id, days: min("days"), co2: min("co2T"), cost: min("totalUsd") };
  }, [pins, pinParams, params]);

  /* ---------- render ---------- */
  return (
    <div className="relative w-full h-[calc(100vh-61px)] min-h-[560px] overflow-hidden">
      <div className="absolute inset-0">
        <MapCanvas
          ports={ports} origin={origin} dest={dest} active={route} pins={pins} layers={layers} radarUrl={radarUrl}
          replayT={replay.on ? replay.t : null} fitSignal={fitSignal}
          onPortClick={pickPort} onSetOrigin={(p) => setOrigin(p)} onSetDest={(p) => setDest(p)}
        />
      </div>

      {/* vignette for depth */}
      <div className="pointer-events-none absolute inset-0 z-[500] [box-shadow:inset_0_0_120px_rgba(5,12,20,0.55)]" />

      {/* control panel */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.15 }}
        className="absolute z-[1000] glass rounded-sm shadow-2xl flex flex-col md:top-4 md:left-4 md:bottom-4 md:w-[372px] left-2 right-2 bottom-2 max-h-[62vh] md:max-h-none"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2 w-2 ${backend === "online" ? "text-signal" : backend === "offline" ? "text-alert" : "text-brass"}`}>
              <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-paper/55">
              {backend === "online" ? "Backend online · live fuel model" : backend === "offline" ? "Backend offline · physics fallback" : "Connecting…"}
            </span>
          </div>
          <button className="md:hidden text-paper/60 text-xs" onClick={() => setCollapsed((c) => !c)}>{collapsed ? "Expand" : "Collapse"}</button>
        </div>

        <div className="relative flex px-3 border-b rule">
          {(["plan", "compare", "layers"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative px-3 py-2 text-sm capitalize transition-colors ${tab === t ? "text-brass-bright" : "text-paper/55 hover:text-paper"}`}>
              {t}{t === "compare" && pins.length > 0 && <span className="ml-1.5 text-[10px] bg-brass/25 text-brass-bright rounded-full px-1.5 py-0.5">{pins.length}</span>}
              {tab === t && <motion.span layoutId="studio-tab" className="absolute left-2 right-2 -bottom-px h-[2px] bg-brass-bright" />}
            </button>
          ))}
        </div>

        <div className={`overflow-y-auto px-4 py-4 flex-1 ${collapsed ? "hidden md:block" : ""}`}>
          <AnimatePresence mode="wait">
            {tab === "plan" && (
              <motion.div key="plan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-4">
                <div className="space-y-3">
                  <PortPicker label="Origin" accent="#6fd08c" value={origin} ports={ports} onPick={setOrigin} exclude={dest?.locode} />
                  <div className="flex justify-center -my-1">
                    <motion.button whileTap={{ rotate: 180 }} onClick={swap} disabled={!origin && !dest} aria-label="Swap origin and destination"
                      className="w-7 h-7 rounded-full border rule text-paper/60 hover:text-brass-bright hover:border-brass disabled:opacity-30 text-sm">⇅</motion.button>
                  </div>
                  <PortPicker label="Destination" accent="#f08a6b" value={dest} ports={ports} onPick={setDest} exclude={origin?.locode} />
                  <p className="text-[11px] text-paper/40">Tip: click any port on the map — first click sets the origin, second the destination. Click open water for coordinates + nearest port.</p>
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-paper/45 mb-2">Quick routes</div>
                  <div className="flex flex-wrap gap-1.5">
                    {scenarioRows.map((s) => (
                      <button key={s.name} onClick={() => loadOD(s.from, s.to)} className="chip chip-brass" title={`Scenario route ${s.name}`}>{s.name.split("_")[0]} · {byCode(s.from)?.name}→{byCode(s.to)?.name}</button>
                    ))}
                    {PRESETS.map((s) => <button key={s.label} onClick={() => loadOD(s.from, s.to)} className="chip">{s.label}</button>)}
                  </div>
                </div>

                <div className="border-t rule pt-2">
                  <Toggle on={!!opts.avoidSuez} onChange={(v) => setOpts((o) => ({ ...o, avoidSuez: v }))} label="Avoid Suez Canal" hint="Reroutes via the Cape of Good Hope" />
                  <Toggle on={!!opts.avoidRedSea} onChange={(v) => setOpts((o) => ({ ...o, avoidRedSea: v }))} label="Avoid Red Sea" hint="Skips Bab-el-Mandeb entirely" />
                </div>

                <div className="border-t rule pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-paper/45">Vessel class</span>
                      <select value={vesselClass} onChange={(e) => { const v = e.target.value as VesselClass; setVesselClass(v); setSpeed(Math.round(DESIGN_SPEED[v] * 0.8)); }}
                        className="mt-1 w-full bg-ink/60 border rule rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-brass">
                        {VESSEL_CLASSES.map((v) => <option key={v} value={v}>{v.replace("_", " ")}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-paper/45">Fuel</span>
                      <select value={fuel} onChange={(e) => setFuel(e.target.value as Fuel)}
                        className="mt-1 w-full bg-ink/60 border rule rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-brass">
                        {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    <span className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-paper/45">
                      <span>Speed</span><span className="text-brass-bright">{speed} kn</span>
                    </span>
                    <input type="range" min={6} max={Math.max(24, Math.round(DESIGN_SPEED[vesselClass] * 1.1))} step={1} value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))} className="w-full mt-1 accent-[#d2a35c]" />
                  </label>
                </div>

                <AnimatePresence mode="wait">
                  {route && est ? (
                    <motion.div key={`${route.from.locode}${route.to.locode}${route.nodeIds.length}`} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26 }} className="space-y-3 border-t rule pt-4">
                      <div className="flex items-baseline justify-between">
                        <div className="font-display text-lg leading-tight">{route.from.name.split(" (")[0]} <span className="text-brass-bright">→</span> {route.to.name.split(" (")[0]}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Stat label="Sea distance" sub={`incl. ${fmt(route.approachNm)} nm harbour legs`}><AnimatedNumber value={route.distanceNm} duration={0.7} /> <span className="text-xs text-paper/50">nm</span></Stat>
                        <Stat label="Transit time" sub={`at ${speed} kn`}><AnimatedNumber value={est.days} decimals={1} duration={0.7} /> <span className="text-xs text-paper/50">days</span></Stat>
                        <Stat label="Fuel burned" sub={rate.source === "backend" ? "Q-FORGE model" : "physics prior (offline)"}><AnimatedNumber value={est.fuelT} duration={0.7} /> <span className="text-xs text-paper/50">t {fuel}</span></Stat>
                        <Stat label="CO₂ (tank-to-wake)" sub={`${CF_TTW[fuel]} t CO₂ / t fuel`}><AnimatedNumber value={est.co2T} duration={0.7} /> <span className="text-xs text-paper/50">t</span></Stat>
                      </div>
                      <div className="rounded-sm border rule bg-ink/40 px-3 py-2.5 text-sm space-y-1">
                        <div className="flex justify-between"><span className="text-paper/60">Fuel cost</span><span className="font-mono">{usd(est.fuelCostUsd)}</span></div>
                        <div className="flex justify-between"><span className="text-paper/60">EU ETS {est.etsCoverage > 0 ? `(${est.etsCoverage * 100}% scope)` : "(out of scope)"}</span><span className="font-mono">{usd(est.etsCostUsd)}</span></div>
                        <div className="flex justify-between border-t rule pt-1 mt-1"><span>Estimated total</span><span className="font-mono text-brass-bright">{usd(est.totalUsd)}</span></div>
                      </div>

                      {route.chokepoints.length > 0 && (
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-wider text-paper/45 mb-1.5">Passes through</div>
                          <div className="flex flex-wrap gap-1.5">{route.chokepoints.map((c) => <span key={c} className="chip chip-static">◆ {c}</span>)}</div>
                        </div>
                      )}
                      {route.zones.length > 0 && (
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-wider text-paper/45 mb-1.5">Zones crossed (indicative)</div>
                          <div className="space-y-1.5">
                            {route.zones.map((z) => (
                              <div key={z.id} className={`text-xs rounded-sm px-2.5 py-1.5 border ${z.kind === "advisory" ? "border-alert/40 bg-alert/10 text-paper/85" : "border-[#4fb3d9]/40 bg-[#4fb3d9]/10 text-paper/85"}`}>
                                <b>{z.name}</b><span className="text-paper/55"> — {z.note}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {scenarioMatch && (
                        <div className="text-xs rounded-sm border border-brass/40 bg-brass/10 px-2.5 py-2 text-paper/80">
                          Scenario file assumes <b>{fmt(scenarioMatch.distance_nm)} nm</b> for {scenarioMatch.name}; this deep-draft lane measures <b>{fmt(route.distanceNm)} nm</b>
                          {" "}({route.distanceNm > scenarioMatch.distance_nm ? "+" : ""}{fmt(((route.distanceNm - scenarioMatch.distance_nm) / scenarioMatch.distance_nm) * 100)}%). Worth reconciling before presenting cost numbers.
                        </div>
                      )}
                      {route.approximateApproach && <p className="text-[11px] text-paper/45">Port has no dedicated harbour approach in the lane graph — snapped to the nearest lane node.</p>}

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button className="btn-primary" onClick={() => setReplay((r) => ({ ...r, on: true, playing: true, rk: routeKey, t: r.rk === routeKey && r.t < 1 ? r.t : 0 }))}>▶ Replay voyage</button>
                        <button className="btn-ghost" onClick={() => setFitSignal((s) => s + 1)}>Fit to route</button>
                        <button className="btn-ghost" onClick={() => pinRoute(route, label(route), params)}>＋ Pin to compare</button>
                        {route.chokepoints.includes("Suez Canal") || (opts.avoidSuez && route.chokepoints.includes("Cape of Good Hope"))
                          ? <button className="btn-ghost" onClick={compareSuez}>Suez vs Cape</button>
                          : <button className="btn-ghost" onClick={copyGeoJSON}>Copy GeoJSON</button>}
                      </div>
                    </motion.div>
                  ) : origin && dest ? (
                    <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-alert border-t rule pt-4">No sea route found between these ports with the current restrictions.</motion.p>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t rule pt-4 text-sm text-paper/50">
                      Pick an origin and destination (search or click ports on the map) to compute a sea route, ETA, fuel, CO₂ and cost.
                    </motion.div>
                  )}
                </AnimatePresence>
                {(origin || dest) && <button onClick={clearAll} className="text-xs text-paper/45 hover:text-brass-bright">Clear selection</button>}
              </motion.div>
            )}

            {tab === "compare" && (
              <motion.div key="compare" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-3">
                {pins.length === 0 ? (
                  <p className="text-sm text-paper/55">Nothing pinned yet. Build a route on the Plan tab and press <b>Pin to compare</b> — you can hold up to 4 (different ports, speeds, fuels, or Suez vs Cape).</p>
                ) : (
                  <>
                    {pins.map((p) => {
                      const e = estimateVoyage(p.route, pinParams[p.id] ?? params);
                      const pp = pinParams[p.id];
                      const win = (k: "dist" | "days" | "co2" | "cost") => best?.[k] === p.id;
                      return (
                        <motion.div layout key={p.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-sm border rule bg-ink/40 p-3" style={{ borderLeft: `3px solid ${p.color}` }}>
                          <div className="flex justify-between gap-2">
                            <button className="text-left text-sm font-medium hover:text-brass-bright" onClick={() => { setOrigin(p.route.from); setDest(p.route.to); setOpts(p.route.options); setTab("plan"); }}>{p.label}</button>
                            <button onClick={() => unpin(p.id)} aria-label="Remove" className="text-paper/40 hover:text-alert text-sm">×</button>
                          </div>
                          {pp && <div className="font-mono text-[10px] text-paper/40 mb-2">{pp.vesselClass.replace("_", " ")} · {pp.fuel} · {pp.speedKn} kn</div>}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                            <span className="text-paper/55">Distance</span><span className={`font-mono text-right ${win("dist") ? "text-signal" : ""}`}>{fmt(p.route.distanceNm)} nm</span>
                            <span className="text-paper/55">Transit</span><span className={`font-mono text-right ${win("days") ? "text-signal" : ""}`}>{fmt(e.days, 1)} d</span>
                            <span className="text-paper/55">CO₂ (TtW)</span><span className={`font-mono text-right ${win("co2") ? "text-signal" : ""}`}>{fmt(e.co2T)} t</span>
                            <span className="text-paper/55">Total cost</span><span className={`font-mono text-right ${win("cost") ? "text-signal" : ""}`}>{usd(e.totalUsd)}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                    {best && <p className="text-[11px] text-paper/45"><span className="text-signal">Green</span> = best of the pinned set on that metric. Cost = fuel + indicative EU ETS using scenario price assumptions; canal tolls are not modelled.</p>}
                    <button onClick={() => { setPins([]); setPinParams({}); }} className="text-xs text-paper/45 hover:text-alert">Clear all</button>
                  </>
                )}
              </motion.div>
            )}

            {tab === "layers" && (
              <motion.div key="layers" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-paper/45 mb-2">Base map</div>
                  <div className="grid grid-cols-2 gap-2">
                    {BASE_LAYERS.map((b) => (
                      <button key={b.id} onClick={() => setLayers((l) => ({ ...l, base: b.id }))}
                        className={`relative rounded-sm border px-3 py-2 text-sm text-left transition-colors ${layers.base === b.id ? "border-brass bg-brass/15 text-brass-bright" : "rule text-paper/65 hover:border-paper/40"}`}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                  {!MAPTILER_KEY && <p className="text-[11px] text-paper/40 mt-2">Optional: set <code>NEXT_PUBLIC_MAPTILER_KEY</code> to unlock high-res satellite.</p>}
                </div>
                <div className="border-t rule pt-2">
                  <Toggle on={layers.ports} onChange={(v) => setLayers((l) => ({ ...l, ports: v }))} label="Ports" hint={`${ports.length} reference ports`} />
                  <Toggle on={layers.seamark} onChange={(v) => setLayers((l) => ({ ...l, seamark: v }))} label="Nautical seamarks" hint="OpenSeaMap buoys, lights & harbours (zoom 5+)" />
                  <Toggle on={layers.zones} onChange={(v) => setLayers((l) => ({ ...l, zones: v }))} label="Advisory areas" hint="Indicative piracy / conflict-disruption zones" />
                  <Toggle on={layers.eca} onChange={(v) => setLayers((l) => ({ ...l, eca: v }))} label="Emission control areas" hint="Mediterranean & North Sea SOx ECAs (indicative)" />
                  <Toggle on={layers.lanes} onChange={(v) => setLayers((l) => ({ ...l, lanes: v }))} label="Show lane network" hint="The routing graph behind every route" />
                  <Toggle on={layers.radar} onChange={(v) => setLayers((l) => ({ ...l, radar: v }))} label="Live rain radar" hint="RainViewer · real data, coastal coverage" />
                </div>
                <div className="border-t rule pt-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-paper/45 mb-2">Global weather (OpenWeather)</div>
                  {OWM_KEY ? (
                    <div className="flex flex-wrap gap-1.5">
                      <button className={`chip ${layers.owm === "" ? "chip-brass" : ""}`} onClick={() => setLayers((l) => ({ ...l, owm: "" }))}>Off</button>
                      {OWM_LAYERS.map((o) => <button key={o.id} className={`chip ${layers.owm === o.id ? "chip-brass" : ""}`} onClick={() => setLayers((l) => ({ ...l, owm: o.id }))}>{o.label}</button>)}
                    </div>
                  ) : <p className="text-[11px] text-paper/45">Add a free key as <code>NEXT_PUBLIC_OWM_KEY</code> to enable wind, clouds, pressure and temperature layers.</p>}
                </div>
                <p className="text-[11px] text-paper/40 leading-relaxed">Lane geometry is a hand-authored, land-validated approximation of main commercial routes — good for planning and visualisation, not for navigation. Zones are indicative shapes, not live threat data.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* replay HUD */}
      <AnimatePresence>
        {replay.on && route && est && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="absolute z-[1000] glass rounded-sm px-4 py-3 bottom-[calc(62vh+16px)] md:bottom-6 left-2 right-2 md:left-[408px] md:right-auto md:w-[min(560px,calc(100%-440px))]">
            <div className="flex items-center gap-3">
              <button className="btn-primary !px-3 !py-1.5" onClick={() => setReplay((r) => ({ ...r, playing: !r.playing, t: r.t >= 1 ? 0 : r.t }))}>{replay.playing ? "❚❚" : "▶"}</button>
              <input type="range" min={0} max={1} step={0.001} value={replay.t} onChange={(e) => setReplay((r) => ({ ...r, t: Number(e.target.value), playing: false }))} className="flex-1 accent-[#d2a35c]" />
              <button className="chip" onClick={() => setReplay((r) => ({ ...r, mult: r.mult >= 4 ? 0.5 : r.mult * 2 }))}>{replay.mult}×</button>
              <button className="text-paper/50 hover:text-paper" onClick={() => setReplay({ on: false, playing: false, t: 0, mult: 1, rk: "" })} aria-label="Close replay">×</button>
            </div>
            <div className="flex justify-between font-mono text-[11px] text-paper/60 mt-1.5">
              <span>Day {fmt(est.days * replay.t, 1)} / {fmt(est.days, 1)}</span>
              <span>{fmt(route.distanceNm * replay.t)} nm · {fmt(est.fuelT * replay.t)} t fuel</span>
            </div>
            <p className="text-[10px] text-paper/35 mt-1">Planned-voyage preview at constant speed — a simulation, not a live AIS position.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
