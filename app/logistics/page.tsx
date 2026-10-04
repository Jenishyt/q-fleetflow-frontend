"use client";

import { useDeferredValue, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { CARGOS, MODE_STYLE, OPERATIONS, PLACES, VEHICLES, type CargoId, type ModeId, type Place } from "@/lib/logistics/data";
import { DEFAULT_PARAMS, plan, type Item, type Option, type Params } from "@/lib/logistics/planner";

const LogisticsMap = dynamic(() => import("@/components/logistics/LogisticsMap"), { ssr: false });
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const dur = (h: number) => (h >= 48 ? `${(h / 24).toFixed(1)} d` : `${h.toFixed(h < 10 ? 1 : 0)} h`);
const co2 = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(kg < 10 ? 1 : 0)} kg`);
const TAG_COLOR: Record<string, string> = { Cheapest: "#6fd08c", Fastest: "#7fb8ff", Greenest: "#c58bd0", Balanced: "#d2a35c" };
const PRESETS: { label: string; p: Partial<Params> }[] = [
  { label: "Delhi → Rotterdam", p: { from: "delhi", to: "rotterdam" } },
  { label: "Bhopal → Chennai", p: { from: "bhopal", to: "chennai" } },
  { label: "Haldia → Varanasi (river)", p: { from: "haldia", to: "varanasi", cargo: "bulk", tonnes: 500, valuePerT: 300 } },
  { label: "Bengaluru → Frankfurt (electronics)", p: { from: "bengaluru", to: "frankfurt", cargo: "electronics", tonnes: 5, valuePerT: 50000, deadlineDays: 20 } },
  { label: "Mumbai → Delhi (cold chain)", p: { from: "mumbai", to: "delhi", cargo: "reefer", tonnes: 18, valuePerT: 4500 } },
  { label: "Shanghai → Chicago", p: { from: "shanghai", to: "chicago" } },
];

function Chip({ on, onClick, children, color }: { on: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return <button onClick={onClick} className={`chip ${on ? "chip-brass" : ""}`} style={on && color ? { borderColor: color, color } : undefined}>{children}</button>;
}

function PlacePicker({ label, value, onPick, exclude, accent }: { label: string; value: Place | null; onPick: (p: Place | null) => void; exclude?: string; accent: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return PLACES.filter((p) => p.id !== exclude && (!s || p.name.toLowerCase().includes(s) || p.country.toLowerCase().includes(s))).slice(0, 8);
  }, [q, exclude]);
  return (
    <div className="relative">
      <label className="block font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: accent }}>{label}</label>
      <input value={open ? q : value ? `${value.name} · ${value.country}` : ""} placeholder="Search a city, port or hub…" onFocus={() => { setOpen(true); setQ(""); }} onBlur={() => setTimeout(() => setOpen(false), 140)}
        onChange={(e) => { setQ(e.target.value); setHi(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          if (e.key === "Enter" && list[hi]) { onPick(list[hi]); (e.target as HTMLInputElement).blur(); }
        }}
        className="w-full bg-ink/60 border rule rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-brass transition-colors" />
      <AnimatePresence>
        {open && list.length > 0 && (
          <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-30 left-0 right-0 mt-1 glass border rule rounded-sm overflow-hidden shadow-2xl">
            {list.map((p, i) => (
              <li key={p.id}><button onMouseDown={(e) => { e.preventDefault(); onPick(p); setOpen(false); }} onMouseEnter={() => setHi(i)} className={`w-full text-left px-3 py-2 text-sm flex justify-between ${i === hi ? "bg-paper/10" : ""}`}>
                <span>{p.name} <span className="text-paper/45">· {p.country}</span></span>
                <span className="text-[10px] text-brass-bright font-mono">{[p.port && "port", p.rail && "rail", p.air && "air", p.waterway && "river"].filter(Boolean).join(" ")}</span></button></li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Bar({ parts }: { parts: { color: string; v: number; label: string }[] }) {
  const tot = parts.reduce((s, p) => s + p.v, 0) || 1;
  return <div className="flex h-2.5 rounded-full overflow-hidden bg-paper/10">{parts.filter((p) => p.v > 0).map((p) => <motion.div key={p.label} layout initial={{ width: 0 }} animate={{ width: `${(p.v / tot) * 100}%` }} style={{ background: p.color }} title={p.label} />)}</div>;
}

function ModeChain({ o }: { o: Option }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      {o.legs.map((l, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-paper/30 text-xs">›</span>}
          <span title={`${l.vehicle.label}${l.role !== "main" ? " (" + (l.role === "first" ? "first mile" : "last mile") + ")" : ""}`} style={{ opacity: l.role === "main" ? 1 : 0.55, fontSize: l.role === "main" ? 17 : 13 }}>{MODE_STYLE[l.vehicle.mode].icon}</span>
        </span>
      ))}
    </div>
  );
}

function Timeline({ items }: { items: Item[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => it.type === "op" ? (
        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-start gap-2 pl-3 text-[11px] text-paper/55 border-l border-paper/15">
          <span className="mt-0.5">•</span><span className="flex-1">{it.op.label} <span className="text-paper/35">@ {it.op.at}</span></span>
          <span className="font-mono text-paper/45 whitespace-nowrap">{dur(it.op.hours)}{it.op.costUsd > 0 ? ` · ${usd(it.op.costUsd)}` : ""}</span>
        </motion.div>
      ) : (
        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="rounded-sm border rule bg-ink/40 px-3 py-2" style={{ borderLeft: `3px solid ${MODE_STYLE[it.leg.vehicle.mode].color}` }}>
          <div className="flex justify-between gap-2 text-sm">
            <span>{MODE_STYLE[it.leg.vehicle.mode].icon} {it.leg.role === "first" ? "First mile · " : it.leg.role === "last" ? "Last mile · " : ""}{it.leg.vehicle.label}</span>
            <span className="font-mono text-brass-bright whitespace-nowrap">{usd(it.leg.costUsd)}</span>
          </div>
          <div className="text-[11px] text-paper/55 mt-0.5">{it.leg.role === "main" ? `${it.leg.from.name} → ${it.leg.to.name}` : it.leg.role === "first" ? `Shipper → ${it.leg.from.name} terminal` : `${it.leg.to.name} terminal → consignee`} · {Math.round(it.leg.distKm).toLocaleString()} km · {dur(it.leg.hours)} · {co2(it.leg.co2Kg)} CO₂e{it.leg.trips > 1 ? ` · ${it.leg.trips} vehicles` : ""}</div>
        </motion.div>
      ))}
    </div>
  );
}

export default function LogisticsPage() {
  const [params, setParams] = useState<Params>({ ...DEFAULT_PARAMS });
  const [tab, setTab] = useState<"plan" | "results" | "assumptions">("plan");
  const [sel, setSel] = useState<string | null>(null);
  const [fit, setFit] = useState(0);
  const set = (p: Partial<Params>) => setParams((x) => ({ ...x, ...p }));

  const deferred = useDeferredValue(params);
  const result = useMemo(() => plan(deferred), [deferred]);
  const stale = deferred !== params;
  const A = PLACES.find((p) => p.id === params.from) ?? null, B = PLACES.find((p) => p.id === params.to) ?? null;
  const cargo = CARGOS.find((c) => c.id === params.cargo)!;
  const active: Option | null = result.options.find((o) => o.id === sel) ?? result.options.find((o) => o.tags.includes("Balanced")) ?? result.options[0] ?? null;
  const cheapest = result.options.find((o) => o.tags.includes("Cheapest")) ?? null;

  const pick = (p: Place) => { if (!params.from) set({ from: p.id }); else if (!params.to && p.id !== params.from) set({ to: p.id }); };
  const setCargo = (id: CargoId) => { const c = CARGOS.find((x) => x.id === id)!; set({ cargo: id, tonnes: c.defaultTonnes, valuePerT: c.valuePerT }); setSel(null); };
  const apply = (p: Partial<Params>) => { const c = p.cargo ? CARGOS.find((x) => x.id === p.cargo)! : cargo; set({ deadlineDays: 45, cargo: c.id, tonnes: c.defaultTonnes, valuePerT: c.valuePerT, ...p }); setSel(null); setFit((f) => f + 1); };
  const toggleV = (id: string) => set({ enabled: { ...params.enabled, [id]: params.enabled[id] === false } });
  const setOv = (id: string, k: "costPerTkm" | "gPerTkm" | "speedKmh", v: number) => set({ overrides: { ...params.overrides, [id]: { ...params.overrides[id], [k]: v } } });

  return (
    <div className="relative w-full h-[calc(100vh-61px)] min-h-[560px] overflow-hidden isolate">
      <div className="absolute inset-0">
        <LogisticsMap places={PLACES} origin={A} dest={B} option={active} fitSignal={fit} onPick={pick} onSet={(k, p) => { set(k === "from" ? { from: p.id } : { to: p.id }); setSel(null); setFit((f) => f + 1); }} />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[500] [box-shadow:inset_0_0_120px_rgba(5,12,20,0.55)]" />

      <motion.aside initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.1 }}
        className="absolute z-[1000] glass rounded-sm shadow-2xl flex flex-col md:top-4 md:left-4 md:bottom-4 md:w-[392px] left-2 right-2 bottom-2 max-h-[64vh] md:max-h-none">
        <div className="px-4 pt-3 pb-1 flex items-baseline justify-between">
          <span className="font-display text-lg">Multi-modal logistics</span>
          <span className="font-mono text-[10px] text-paper/40">{stale ? "planning…" : `${result.options.length} options · ${result.ms.toFixed(0)} ms`}</span>
        </div>
        <div className="relative flex px-3 border-b rule">
          {(["plan", "results", "assumptions"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative px-3 py-2 text-sm capitalize ${tab === t ? "text-brass-bright" : "text-paper/55 hover:text-paper"}`}>
              {t}{t === "results" && result.options.length > 0 && <span className="ml-1.5 text-[10px] bg-brass/25 text-brass-bright rounded-full px-1.5 py-0.5">{result.options.length}</span>}
              {tab === t && <motion.span layoutId="log-tab" className="absolute left-2 right-2 -bottom-px h-[2px] bg-brass-bright" />}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-4 py-4 flex-1">
          <AnimatePresence mode="wait">
            {tab === "plan" && (
              <motion.div key="plan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="space-y-4">
                <PlacePicker label="Origin (shipper)" accent="#6fd08c" value={A} onPick={(p) => { set({ from: p?.id ?? "" }); setSel(null); setFit((f) => f + 1); }} exclude={params.to} />
                <PlacePicker label="Destination (consignee)" accent="#f08a6b" value={B} onPick={(p) => { set({ to: p?.id ?? "" }); setSel(null); setFit((f) => f + 1); }} exclude={params.from} />
                <p className="text-[11px] text-paper/40 -mt-2">Or click places on the map. Blue = port, violet = airport, light blue = rail terminal, gold = road only.</p>
                <div className="flex flex-wrap gap-1.5">{PRESETS.map((s) => <button key={s.label} className="chip" onClick={() => apply(s.p)}>{s.label}</button>)}</div>

                <div className="border-t rule pt-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-paper/45 mb-2">Cargo type</div>
                  <div className="flex flex-wrap gap-1.5">{CARGOS.map((c) => <Chip key={c.id} on={params.cargo === c.id} onClick={() => setCargo(c.id)}>{c.label}</Chip>)}</div>
                  <p className="text-[11px] text-paper/45 mt-1.5">{cargo.blurb}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="font-mono text-[10px] uppercase tracking-wider text-paper/45">Shipment (tonnes)</span>
                    <input type="number" min={0.01} step="any" value={params.tonnes} onChange={(e) => set({ tonnes: Math.max(0.01, Number(e.target.value) || 0.01) })} className="mt-1 w-full bg-ink/60 border rule rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-brass" /></label>
                  <label className="block"><span className="font-mono text-[10px] uppercase tracking-wider text-paper/45">Cargo value ($/t)</span>
                    <input type="number" min={0} value={params.valuePerT} onChange={(e) => set({ valuePerT: Math.max(0, Number(e.target.value) || 0) })} className="mt-1 w-full bg-ink/60 border rule rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-brass" /></label>
                </div>
                {[
                  { k: "deadlineDays" as const, l: "Deadline", min: 1, max: 90, u: " days" },
                  { k: "carbonUsdPerT" as const, l: "Internal carbon price", min: 0, max: 300, u: " $/t CO₂e" },
                  { k: "storageDays" as const, l: "Buffer storage at destination", min: 0, max: 14, u: " days" },
                ].map((s) => (
                  <label key={s.k} className="block"><span className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-paper/45"><span>{s.l}</span><span className="text-brass-bright">{params[s.k]}{s.u}</span></span>
                    <input type="range" min={s.min} max={s.max} value={params[s.k]} onChange={(e) => set({ [s.k]: Number(e.target.value) })} className="w-full mt-1 accent-[#d2a35c]" /></label>
                ))}

                <div className="border-t rule pt-3 space-y-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-paper/45">Transport options allowed</div>
                  {(["road", "rail", "barge", "sea", "air", "urban"] as ModeId[]).map((m) => (
                    <div key={m}>
                      <div className="text-[11px] mb-1" style={{ color: MODE_STYLE[m].color }}>{MODE_STYLE[m].icon} {MODE_STYLE[m].label}</div>
                      <div className="flex flex-wrap gap-1.5">{VEHICLES.filter((v) => v.mode === m).map((v) => {
                        const ok = cargo.allow(v), on = params.enabled[v.id] !== false && ok;
                        return <button key={v.id} disabled={!ok} title={ok ? v.note : `Not allowed for ${cargo.label.toLowerCase()}`} onClick={() => toggleV(v.id)} className={`chip ${on ? "chip-brass" : ""} ${ok ? "" : "opacity-30 line-through cursor-not-allowed"}`}>{v.label}</button>;
                      })}</div>
                    </div>
                  ))}
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={params.avoidSuez} onChange={(e) => set({ avoidSuez: e.target.checked })} className="accent-[#d2a35c]" />Avoid the Suez Canal on sea legs</label>
                </div>
              </motion.div>
            )}

            {tab === "results" && (
              <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="space-y-4">
                {result.error ? <p className="text-sm text-alert">{result.error}</p> : (
                  <>
                    {result.deadlineMissed && <p className="text-xs rounded-sm border border-alert/40 bg-alert/10 px-3 py-2 text-paper/80">No option meets the {params.deadlineDays}-day deadline. Showing the best available options anyway.</p>}
                    <div className="h-[200px] -mx-1">
                      <Plot
                        data={[{ type: "scatter", mode: "markers", x: result.options.map((o) => o.totals.totalUsd), y: result.options.map((o) => o.totals.co2Kg / 1000), text: result.options.map((o) => `${o.tags.join(" / ") || "Option"} · ${dur(o.totals.hours)}`),
                          marker: { size: result.options.map((o) => (o.id === active?.id ? 16 : 10)), color: result.options.map((o) => o.totals.hours / 24), colorscale: [[0, "#6fd08c"], [1, "#c4553d"]], showscale: false, line: { color: "#e7e4d6", width: result.options.map((o) => (o.id === active?.id ? 2 : 0)) } },
                          hovertemplate: "%{text}<br>$%{x:,.0f} · %{y:.2f} t CO₂e<extra></extra>" } as Plotly.Data]}
                        layout={{ autosize: true, height: 200, margin: { l: 44, r: 8, t: 6, b: 34 }, paper_bgcolor: "transparent", plot_bgcolor: "transparent", font: { color: "#e7e4d6", family: "IBM Plex Mono", size: 9 }, xaxis: { title: { text: "Total cost ($)" }, gridcolor: "rgba(231,228,214,0.08)" }, yaxis: { title: { text: "t CO₂e" }, gridcolor: "rgba(231,228,214,0.08)" } }}
                        config={{ displayModeBar: false }} style={{ width: "100%" }}
                        onClick={(e) => { const i = e.points?.[0]?.pointIndex; if (i !== undefined) setSel(result.options[i].id); }}
                      />
                    </div>
                    <p className="text-[10px] text-paper/40 -mt-2">Each dot is a different way to move the cargo. Green = quicker, red = slower. Click a dot or card.</p>
                    <div className="space-y-2">
                      {result.options.map((o) => {
                        const on = o.id === active?.id;
                        return (
                          <motion.button layout key={o.id} onClick={() => setSel(o.id)} whileHover={{ x: 3 }} className={`w-full text-left rounded-sm border px-3 py-2.5 transition-colors ${on ? "border-brass bg-brass/10" : "rule bg-ink/40 hover:border-paper/40"}`}>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex flex-wrap gap-1">{o.tags.map((t) => <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm" style={{ background: `${TAG_COLOR[t]}22`, color: TAG_COLOR[t] }}>{t}</span>)}{!o.tags.length && <span className="text-[10px] font-mono text-paper/35">Option</span>}</div>
                              <ModeChain o={o} />
                            </div>
                            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                              <span>{usd(o.totals.totalUsd)}{cheapest && o !== cheapest && <i className="block not-italic text-[10px] text-paper/40">+{Math.round((o.totals.totalUsd / cheapest.totals.totalUsd - 1) * 100)}%</i>}</span>
                              <span>{dur(o.totals.hours)}</span><span>{co2(o.totals.co2Kg)}</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                    {active && (
                      <motion.div key={active.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border-t rule pt-4 space-y-3">
                        <div className="font-display text-lg">Itinerary</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-sm border rule bg-ink/40 px-3 py-2"><div className="font-mono text-[10px] uppercase text-paper/45">Total cost</div><b className="font-display text-xl">{usd(active.totals.totalUsd)}</b></div>
                          <div className="rounded-sm border rule bg-ink/40 px-3 py-2"><div className="font-mono text-[10px] uppercase text-paper/45">Door to door</div><b className="font-display text-xl">{dur(active.totals.hours)}</b></div>
                          <div className="rounded-sm border rule bg-ink/40 px-3 py-2"><div className="font-mono text-[10px] uppercase text-paper/45">Emissions</div><b className="font-display text-xl">{co2(active.totals.co2Kg)}</b><span className="text-[10px] text-paper/40"> CO₂e</span></div>
                          <div className="rounded-sm border rule bg-ink/40 px-3 py-2"><div className="font-mono text-[10px] uppercase text-paper/45">Distance</div><b className="font-display text-xl">{Math.round(active.totals.distKm).toLocaleString()}</b><span className="text-[10px] text-paper/40"> km</span></div>
                        </div>
                        <div className="text-[11px] text-paper/55 space-y-0.5 font-mono">
                          <div className="flex justify-between"><span>Freight</span><span>{usd(active.totals.freightUsd)}</span></div>
                          <div className="flex justify-between"><span>Handling, customs, storage</span><span>{usd(active.totals.opsUsd)}</span></div>
                          <div className="flex justify-between"><span>Inventory carrying cost</span><span>{usd(active.totals.inventoryUsd)}</span></div>
                          {params.carbonUsdPerT > 0 && <div className="flex justify-between"><span>Carbon cost</span><span>{usd(active.totals.carbonUsd)}</span></div>}
                        </div>
                        {result.baseline && active !== result.baseline && (
                          <p className="text-xs rounded-sm border border-brass/40 bg-brass/10 px-3 py-2 text-paper/80">
                            Versus an all-road truck: cost <b>{active.totals.totalUsd <= result.baseline.totals.totalUsd ? "−" : "+"}{Math.abs(Math.round((active.totals.totalUsd / result.baseline.totals.totalUsd - 1) * 100))}%</b>, emissions <b>{active.totals.co2Kg <= result.baseline.totals.co2Kg ? "−" : "+"}{Math.abs(Math.round((active.totals.co2Kg / result.baseline.totals.co2Kg - 1) * 100))}%</b>, time <b>{active.totals.hours <= result.baseline.totals.hours ? "−" : "+"}{dur(Math.abs(active.totals.hours - result.baseline.totals.hours))}</b>.
                          </p>
                        )}
                        <div><div className="font-mono text-[10px] uppercase text-paper/45 mb-1.5">Emissions by mode</div>
                          <Bar parts={(Object.entries(active.totals.co2ByMode) as [ModeId, number][]).map(([m, v]) => ({ color: MODE_STYLE[m].color, v, label: MODE_STYLE[m].label }))} /></div>
                        <div><div className="font-mono text-[10px] uppercase text-paper/45 mb-1.5">Time in motion by mode</div>
                          <Bar parts={(Object.entries(active.totals.hoursByMode) as [ModeId, number][]).map(([m, v]) => ({ color: MODE_STYLE[m].color, v, label: MODE_STYLE[m].label }))} /></div>
                        <Timeline items={active.items} />
                        <button className="btn-ghost w-full" onClick={() => setFit((f) => f + 1)}>Fit route on map</button>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {tab === "assumptions" && (
              <motion.div key="assumptions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="space-y-4">
                <p className="text-xs rounded-sm border border-brass/40 bg-brass/10 px-3 py-2 text-paper/80">All factors are <b>indicative assumptions</b> in typical published ranges, not measured or quoted data. Edit any value to plug in your own tariffs and emission factors; results update instantly.</p>
                <div className="space-y-2">
                  {VEHICLES.map((v) => {
                    const o = params.overrides[v.id] ?? {};
                    return (
                      <div key={v.id} className="rounded-sm border rule bg-ink/40 p-2.5" style={{ borderLeft: `3px solid ${MODE_STYLE[v.mode].color}` }}>
                        <div className="text-sm">{MODE_STYLE[v.mode].icon} {v.label}</div>
                        <div className="text-[10px] text-paper/40 mb-1.5">{v.note}</div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-paper/50">
                          {([["costPerTkm", "$/t-km", 0.001], ["gPerTkm", "gCO₂e/t-km", 1], ["speedKmh", "km/h", 1]] as const).map(([k, l, step]) => (
                            <label key={k}>{l}<input type="number" step={step} min={0} value={o[k] ?? v[k]} onChange={(e) => setOv(v.id, k, Math.max(0, Number(e.target.value) || 0))} className="mt-0.5 w-full bg-ink/70 border rule rounded-sm px-1.5 py-1 text-xs text-paper focus:outline-none focus:border-brass" /></label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="btn-ghost w-full" onClick={() => set({ overrides: {} })}>Reset all to defaults</button>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-paper/45 mb-2">Operations the planner models</div>
                  <ul className="space-y-1.5">{OPERATIONS.map((o) => <li key={o.kind} className="text-xs"><b className="text-paper/85">{o.label}.</b> <span className="text-paper/55">{o.when}</span></li>)}</ul>
                </div>
                <p className="text-[11px] text-paper/40">Road and rail distances are great-circle distance times a circuity factor; sea legs follow the land-validated sea-lane network; places and hub attributes are simplified. Not for operational use.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </div>
  );
}
