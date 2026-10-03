"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import AnimatedNumber from "@/components/AnimatedNumber";
import { STUDIES } from "@/lib/studiesData";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Res {
  cost_usd: number; ghg_intensity: number; limit: number; compliant: boolean; risk_hours: number; shore_share: number;
  fuel_cost_usd: number; ets_cost_usd: number; co2_ttw_t: number;
  fuel_energy_share: Record<string, number>; vessel_mix: Record<string, number>;
}
interface Cell { eua_usd_per_t: number; alt_fuel_price_mult: number; cost_usd: number; ghg_intensity: number; compliant: boolean; fuel_energy_share: Record<string, number> }
interface Case { id: string; name: string; description: string; results: { qiea: Res; nsga2: Res } }
const S = STUDIES as unknown as {
  meta: { seeds: number[]; n_pop: number; n_generations: number; year: number; qieaBestCostSdPct: number };
  sensitivity: { eua: number[]; alt_mult: number[]; cells: Cell[] };
  cases: Case[];
};

const FUEL_COLORS: Record<string, string> = { MDO: "#8a6a5c", VLSFO: "#b8863b", LNG: "#7fb8ff", MeOH: "#6fd08c", NH3: "#c58bd0", H2: "#f4d9a6" };
const CLASS_COLORS: Record<string, string> = { container: "#7fb8ff", bulk_carrier: "#6fd08c", tanker: "#d2a35c", general_cargo: "#8a6a5c" };
const CLASS_DWT: Record<string, string> = { container: "40k", bulk_carrier: "55k", tanker: "60k", general_cargo: "15k" };
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;
const altLabel = (m: number) => (m === 1 ? "Base prices" : `−${Math.round((1 - m) * 100)}%`);

function Stack({ data, colors, labels }: { data: Record<string, number>; colors: Record<string, string>; labels?: Record<string, string> }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const tot = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-paper/10">
        {entries.map(([k, v]) => (
          <motion.div key={k} layout initial={{ width: 0 }} animate={{ width: `${(v / tot) * 100}%` }} transition={{ type: "spring", stiffness: 160, damping: 22 }} style={{ background: colors[k] ?? "#999" }} title={`${k} ${pct(v / tot)}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {entries.map(([k, v]) => (
          <span key={k} className="text-[11px] text-paper/60 flex items-center gap-1.5"><i className="inline-block w-2 h-2 rounded-full" style={{ background: colors[k] ?? "#999" }} />{k}{labels?.[k] ? ` ${labels[k]}` : ""} <b className="font-mono text-paper/80">{pct(v / tot)}</b></span>
        ))}
      </div>
    </div>
  );
}

const Btn = ({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className={`chip ${on ? "chip-brass" : ""}`}>{children}</button>
);

export default function ScenariosPage() {
  const [eua, setEua] = useState(150);
  const [alt, setAlt] = useState(0.6);
  const [caseId, setCaseId] = useState("surge");

  const cell = S.sensitivity.cells.find((c) => c.eua_usd_per_t === eua && c.alt_fuel_price_mult === alt)!;
  const ref = S.sensitivity.cells.find((c) => c.eua_usd_per_t === 80 && c.alt_fuel_price_mult === 1)!;
  const delta = cell.cost_usd / ref.cost_usd - 1;
  const noise = S.meta.qieaBestCostSdPct / 100;
  const meaningful = Math.abs(delta) > 2 * noise;

  const z = S.sensitivity.alt_mult.map((a) => S.sensitivity.eua.map((e) => S.sensitivity.cells.find((c) => c.eua_usd_per_t === e && c.alt_fuel_price_mult === a)!.cost_usd));
  const cases = S.cases;
  const base = cases.find((c) => c.id === "base")!;
  const cur = cases.find((c) => c.id === caseId)!;
  const large = (r: Res) => 1 - (r.vessel_mix.general_cargo ?? 0);

  const insight = useMemo(() => {
    const q = cur.results.qiea, n = cur.results.nsga2, bq = base.results.qiea, bn = base.results.nsga2;
    const d = (a: number, b: number) => `${a >= b ? "+" : ""}${Math.round((a / b - 1) * 100)}%`;
    if (cur.id === "surge") return `Demand +50% raises cost ${d(q.cost_usd, bq.cost_usd)} (QIEA) and ${d(n.cost_usd, bn.cost_usd)} (NSGA-II). The share of sailings on 40k+ DWT classes goes from ${pct(large(bq))} to ${pct(large(q))} (QIEA) and ${pct(large(bn))} to ${pct(large(n))} (NSGA-II): capacity is a real decision, and the 15k DWT feeder is the first thing dropped.`;
    if (cur.id === "green") return `Cheaper alternative fuels and a higher carbon price cut fuel-mix intensity from ${bq.ghg_intensity} to ${q.ghg_intensity} gCO₂e/MJ (QIEA) and ${bn.ghg_intensity} to ${n.ghg_intensity} (NSGA-II), with hydrogen's energy share rising to ${pct(q.fuel_energy_share.H2 ?? 0)} (QIEA) and ${pct(n.fuel_energy_share.H2 ?? 0)} (NSGA-II).`;
    if (cur.id === "tight") return `Cutting the weekly sailing window to 40 h makes schedule risk bite: delay hours rise from ${bq.risk_hours} to ${q.risk_hours} (QIEA) and ${bn.risk_hours} to ${n.risk_hours} (NSGA-II). The cheapest compliant plan still accepts these delays, which is exactly the cost-vs-reliability trade-off the third objective exposes.`;
    return "The reference network: three Chennai-centred routes, four weeks, two sailings per week. Every other case is a change to this one.";
  }, [cur, base]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-brass-bright mb-3">Scenario analysis &amp; case studies</motion.p>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl md:text-4xl mb-3">What changes when the world changes?</motion.h1>
      <p className="text-paper/60 text-sm max-w-3xl">
        Every result below is a real optimizer run (QIEA, {S.meta.seeds.length} seeds pooled, population {S.meta.n_pop} × {S.meta.n_generations} generations, year {S.meta.year}) on a variant of the base scenario.
        We report the <b className="text-paper/85">cheapest FuelEU-compliant plan</b> found. Prices are editable assumptions, not market data.
      </p>

      {/* sensitivity */}
      <div className="mt-12 mb-4"><div className="flex items-baseline gap-3"><span className="font-mono text-xs text-brass-bright">1</span><h2 className="font-display text-2xl">Fuel &amp; carbon price sensitivity</h2></div>
        <p className="text-sm text-paper/55 mt-1 max-w-3xl">Vary the EU carbon price and the price of methanol, ammonia and hydrogen together. Click a cell or use the buttons.</p></div>
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <div className="border rule rounded-sm bg-ink-raised p-5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-paper/45 mb-2">EU carbon price (USD per tonne CO₂)</div>
          <div className="flex flex-wrap gap-2 mb-5">{S.sensitivity.eua.map((e) => <Btn key={e} on={eua === e} onClick={() => setEua(e)}>${e}</Btn>)}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-paper/45 mb-2">Methanol / ammonia / hydrogen price</div>
          <div className="flex flex-wrap gap-2 mb-6">{S.sensitivity.alt_mult.map((a) => <Btn key={a} on={alt === a} onClick={() => setAlt(a)}>{altLabel(a)}</Btn>)}</div>

          <AnimatePresence mode="wait">
            <motion.div key={`${eua}-${alt}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-sm border rule bg-ink/40 px-3 py-2.5"><div className="font-mono text-[10px] uppercase text-paper/45">Best compliant cost</div><div className="font-display text-2xl">$<AnimatedNumber value={cell.cost_usd} duration={0.6} /></div></div>
                <div className="rounded-sm border rule bg-ink/40 px-3 py-2.5"><div className="font-mono text-[10px] uppercase text-paper/45">GHG intensity</div><div className="font-display text-2xl"><AnimatedNumber value={cell.ghg_intensity} decimals={1} duration={0.6} /> <span className="text-xs text-paper/50">/ limit 89.3</span></div></div>
              </div>
              <div className="text-xs rounded-sm border px-3 py-2" style={{ borderColor: meaningful ? "#6fd08c66" : "#d2a35c66", background: meaningful ? "#6fd08c12" : "#d2a35c12" }}>
                {eua === 80 && alt === 1 ? "This is the reference cell." : <>
                  <b>{delta >= 0 ? "+" : ""}{(delta * 100).toFixed(1)}%</b> vs the reference (${80}, base prices). {meaningful ? "Larger than the solver's run-to-run noise, so it is a real effect." : `Within the solver's run-to-run noise (about ±${(noise * 100).toFixed(1)}% standard deviation), so do not read it as a real effect.`}</>}
              </div>
              <div><div className="font-mono text-[10px] uppercase text-paper/45 mb-2">Fuel mix (share of energy)</div><Stack data={cell.fuel_energy_share} colors={FUEL_COLORS} /></div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="border rule rounded-sm bg-ink-raised p-4">
          <p className="text-sm text-paper/70 px-2 mb-1">Best compliant plan cost (USD) across the grid</p>
          <Plot
            data={[{ type: "heatmap", x: S.sensitivity.eua.map((e) => `$${e}`), y: S.sensitivity.alt_mult.map(altLabel), z, colorscale: [[0, "#1b4b5a"], [0.5, "#b8863b"], [1, "#c4553d"]], showscale: false,
              text: z.map((r) => r.map((v) => usd(v))) as unknown as string[], texttemplate: "%{text}", hovertemplate: "carbon %{x}, alt fuels %{y}<br>%{text}<extra></extra>" } as Plotly.Data]}
            layout={{ autosize: true, height: 300, margin: { l: 90, r: 10, t: 10, b: 45 }, paper_bgcolor: "transparent", plot_bgcolor: "transparent", font: { color: "#e7e4d6", family: "IBM Plex Mono", size: 11 }, xaxis: { title: { text: "EU carbon price" } }, yaxis: { title: { text: "Alt-fuel price" } } }}
            config={{ displayModeBar: false }} style={{ width: "100%" }}
            onClick={(e) => { const p = e.points?.[0]; if (!p) return; setEua(Number(String(p.x).replace("$", ""))); const a = S.sensitivity.alt_mult.find((m) => altLabel(m) === p.y); if (a !== undefined) setAlt(a); }}
          />
          <p className="text-xs text-paper/45 px-2 mt-1 leading-relaxed">
            The carbon price is the dominant lever: cost rises steadily across each row. Alternative-fuel discounts move the answer far less than the solver&apos;s own noise at most carbon prices, which is itself a finding: under a 2026 FuelEU limit (2% below baseline) the fleet complies mostly by blending a little hydrogen into conventional fuel rather than switching wholesale.
          </p>
        </div>
      </div>

      {/* case studies */}
      <div className="mt-14 mb-4"><div className="flex items-baseline gap-3"><span className="font-mono text-xs text-brass-bright">2</span><h2 className="font-display text-2xl">Case studies</h2></div>
        <p className="text-sm text-paper/55 mt-1 max-w-3xl">Four what-if variants of the base network, each solved by QIEA and by NSGA-II. NSGA-II finds cheaper plans in every case, consistent with the benchmark.</p></div>
      <div className="flex flex-wrap gap-2 mb-4">{cases.map((c) => <Btn key={c.id} on={caseId === c.id} onClick={() => setCaseId(c.id)}>{c.name}</Btn>)}</div>
      <AnimatePresence mode="wait">
        <motion.div key={cur.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="border rule rounded-sm bg-ink-raised p-5 md:p-6">
          <p className="text-sm text-paper/70 mb-1">{cur.description}</p>
          <p className="text-sm text-brass-bright/90 mb-5">{insight}</p>
          <div className="grid md:grid-cols-2 gap-5">
            {([["QIEA (ours)", cur.results.qiea], ["NSGA-II", cur.results.nsga2]] as [string, Res][]).map(([name, r]) => (
              <div key={name} className="rounded-sm border rule bg-ink/40 p-4">
                <div className="font-display text-lg mb-3">{name}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-4">
                  <span className="text-paper/55">Total cost</span><span className="font-mono text-right">{usd(r.cost_usd)}</span>
                  <span className="text-paper/55">GHG intensity</span><span className="font-mono text-right">{r.ghg_intensity} <span className="text-paper/40">/ {r.limit}</span></span>
                  <span className="text-paper/55">FuelEU</span><span className="font-mono text-right" style={{ color: r.compliant ? "#6fd08c" : "#c4553d" }}>{r.compliant ? "compliant" : "non-compliant"}</span>
                  <span className="text-paper/55">Delay hours</span><span className="font-mono text-right">{r.risk_hours}</span>
                  <span className="text-paper/55">Shore-power legs</span><span className="font-mono text-right">{pct(r.shore_share)}</span>
                  <span className="text-paper/55">CO₂ (tank-to-wake)</span><span className="font-mono text-right">{r.co2_ttw_t.toLocaleString()} t</span>
                </div>
                <div className="font-mono text-[10px] uppercase text-paper/45 mb-2">Vessel classes (share of sailings, capacity in DWT)</div>
                <div className="mb-4"><Stack data={r.vessel_mix} colors={CLASS_COLORS} labels={CLASS_DWT} /></div>
                <div className="font-mono text-[10px] uppercase text-paper/45 mb-2">Fuel mix (share of energy)</div>
                <Stack data={r.fuel_energy_share} colors={FUEL_COLORS} />
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      <p className="text-[11px] text-paper/40 mt-6 max-w-3xl">
        Scenario distances are stylised planning inputs. Plans are the cheapest compliant point of each run&apos;s Pareto archive, so delay hours can be high: the optimizer trades them for cost. Reproduce with <code>python src/optimizer/scenario_study.py</code>.
      </p>
    </div>
  );
}
