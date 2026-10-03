"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import InfoTip from "@/components/InfoTip";
import { ACC, CONV, OPT_DATA, OPT_TESTS, SCAL } from "@/lib/benchmarkData";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const DATA = OPT_DATA as unknown as Record<string, { hv: number[]; feas: number[]; cost: number[] }>;
const COLORS: Record<string, string> = { QIEA: "#d2a35c", Random: "#1b4b5a", "NSGA-II": "#4a7c59", "Weighted GA": "#c4553d" };
const mean = (a: readonly number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const base = {
  paper_bgcolor: "transparent", plot_bgcolor: "transparent",
  font: { color: "#e7e4d6", family: "IBM Plex Mono", size: 10 },
};
const grid = { gridcolor: "rgba(231,228,214,0.08)" };
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`border rule rounded-sm bg-ink-raised p-4 ${className}`}>{children}</motion.div>
);
const Cap = ({ children }: { children: React.ReactNode }) => <p className="text-xs text-paper/45 px-2 mt-1 leading-relaxed">{children}</p>;
const H = ({ n, t, s }: { n: string; t: string; s: string }) => (
  <div className="mt-14 mb-4"><div className="flex items-baseline gap-3"><span className="font-mono text-xs text-brass-bright">{n}</span><h2 className="font-display text-2xl">{t}</h2></div><p className="text-sm text-paper/55 mt-1 max-w-3xl">{s}</p></div>
);

export default function ComparePage() {
  const algos = Object.keys(DATA);
  const m = Object.fromEntries(algos.map((a) => [a, { hv: mean(DATA[a].hv), feas: mean(DATA[a].feas), best: Math.min(...DATA[a].cost) }]));
  const feasText = [...algos].sort((a, b) => m[b].feas - m[a].feas).map((a) => `${a} ${m[a].feas.toFixed(1)}%`).join(", ");
  const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const accSorted = ACC.models;
  const bestMape = Math.min(...accSorted.map((x) => x.mape));
  const tHand = ACC.tests.find((t) => t.vs.includes("hand-set"))!;
  const tRand = ACC.tests.find((t) => t.vs.includes("random"))!;
  const tLgb = ACC.tests.find((t) => t.vs.includes("LightGBM"))!;
  const scalGap = SCAL.routes.map((_, i) => 1 - SCAL.nsga2[i] / SCAL.qiea[i]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-brass-bright mb-3">Benchmark analysis</motion.p>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl mb-2">Algorithm &amp; model comparison</motion.h1>
      <p className="text-paper/60 text-sm max-w-3xl">
        Measured on the current scenario (24 genes, 144 alleles each, 40 population x 150 generations, 10 seeds) from the backend&apos;s <code className="font-mono text-brass-bright">results/*.csv</code>.
        Four things are benchmarked, as the problem statement asks: solution quality, convergence speed, scalability and prediction accuracy. We publish the table including where we lose.
      </p>

      <H n="1" t="Solution quality" s="QIEA against random search, a weighted-sum GA and NSGA-II on the same encoding and budget." />
      <Card className="mb-6">
        <p className="text-sm text-paper/70 mb-2 px-2">
          <InfoTip term="Hypervolume">The volume of solution-space a Pareto front dominates; higher means better trade-off coverage across cost, GHG and schedule risk at once.</InfoTip> across 10 seeds
        </p>
        <Plot
          data={algos.map((a) => ({ type: "box", y: DATA[a].hv, name: a, boxpoints: "all", jitter: 0.4, pointpos: 0, marker: { color: COLORS[a], size: 5 }, line: { color: COLORS[a] }, fillcolor: `${COLORS[a]}22` }))}
          layout={{ ...base, autosize: true, height: 360, margin: { l: 50, r: 20, t: 10, b: 40 }, yaxis: { title: { text: "Hypervolume (billions)" }, ...grid }, xaxis: grid, showlegend: false }}
          config={{ displayModeBar: false }} style={{ width: "100%" }}
        />
        <Cap>
          NSGA-II scores about {(m["NSGA-II"].hv / m.QIEA.hv).toFixed(1)}x QIEA&apos;s hypervolume ({m["NSGA-II"].hv.toFixed(1)}B vs {m.QIEA.hv.toFixed(1)}B). QIEA clearly beats random search ({m.Random.hv.toFixed(1)}B).
          The weighted GA returns one point per run, so its score is not a like-for-like front comparison.
        </Cap>
      </Card>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <p className="text-sm text-paper/70 mb-2 px-2">Feasibility rate per seed (%)</p>
          <Plot
            data={algos.map((a) => ({ type: "box", y: DATA[a].feas, name: a, boxpoints: "all", jitter: 0.4, pointpos: 0, marker: { color: COLORS[a], size: 5 }, line: { color: COLORS[a] }, fillcolor: `${COLORS[a]}22` }))}
            layout={{ ...base, autosize: true, height: 300, margin: { l: 45, r: 15, t: 10, b: 60 }, yaxis: { ...grid, range: [-5, 105] }, xaxis: grid, showlegend: false }}
            config={{ displayModeBar: false }} style={{ width: "100%" }}
          />
          <Cap>Mean feasibility: {feasText}. QIEA does not lead here.</Cap>
        </Card>
        <Card>
          <p className="text-sm text-paper/70 mb-2 px-2">Cost vs. feasibility (all 40 runs)</p>
          <Plot
            data={algos.map((a) => ({ type: "scatter", mode: "markers", name: a, x: DATA[a].cost, y: DATA[a].feas, marker: { color: COLORS[a], size: 9, opacity: 0.85 } }))}
            layout={{ ...base, autosize: true, height: 300, margin: { l: 45, r: 15, t: 10, b: 40 }, xaxis: { title: { text: "Best cost ($)" }, ...grid }, yaxis: { title: { text: "Feasibility %" }, ...grid }, legend: { orientation: "h", y: -0.25, font: { size: 9 } } }}
            config={{ displayModeBar: false }} style={{ width: "100%" }}
          />
          <Cap>Cheapest plan found: NSGA-II {usd(m["NSGA-II"].best)}, weighted GA {usd(m["Weighted GA"].best)}, random {usd(m.Random.best)}, QIEA {usd(m.QIEA.best)}.</Cap>
        </Card>
      </div>
      <div className="border rule rounded-sm p-5 text-sm text-paper/70 bg-ink-raised/50">
        <p className="text-brass-bright text-xs font-mono mb-2">Wilcoxon signed-rank test (paired by seed, on hypervolume)</p>
        {OPT_TESTS.map((t) => (
          <p key={t.b}>{t.a} vs {t.b}: <b className="text-paper">p = {t.p}</b> — {t.p < 0.05 ? "significant" : "not significant"}, {t.winner} scores higher.</p>
        ))}
        <p className="text-xs text-paper/45 mt-3">An earlier table (older encoding) showed a QIEA feasibility advantage. It does not reproduce on the current encoding, so we no longer claim it.</p>
      </div>

      <H n="2" t="Convergence speed" s="Hypervolume reached at each generation budget (mean of 3 seeds), against each algorithm's own 400-generation estimate." />
      <Card>
        <Plot
          data={[
            { type: "scatter", mode: "lines+markers", name: "QIEA", x: [...CONV.gens], y: [...CONV.qiea], line: { color: COLORS.QIEA, width: 3 } },
            { type: "scatter", mode: "lines+markers", name: "NSGA-II", x: [...CONV.gens], y: [...CONV.nsga2], line: { color: COLORS["NSGA-II"], width: 3 } },
          ]}
          layout={{ ...base, autosize: true, height: 320, margin: { l: 55, r: 20, t: 10, b: 45 }, xaxis: { title: { text: "Generations" }, ...grid }, yaxis: { title: { text: "Hypervolume (billions)" }, ...grid }, legend: { orientation: "h", y: -0.25 } }}
          config={{ displayModeBar: false }} style={{ width: "100%" }}
        />
        <Cap>At generation 150, QIEA has reached {CONV.ceilingPct.qiea}% of its own {CONV.ceilingGen}-generation ceiling and NSGA-II {CONV.ceilingPct.nsga2}%. Neither has fully converged; NSGA-II converges faster.</Cap>
      </Card>

      <H n="3" t="Scalability" s="Wall-clock time as the problem grows from 3 to 12 routes (24 to 96 genes), 3 seeds each." />
      <Card>
        <Plot
          data={[
            { type: "bar", name: "QIEA", x: SCAL.genes.map((g) => `${g} genes`), y: [...SCAL.qiea], marker: { color: COLORS.QIEA } },
            { type: "bar", name: "NSGA-II", x: SCAL.genes.map((g) => `${g} genes`), y: [...SCAL.nsga2], marker: { color: COLORS["NSGA-II"] } },
          ]}
          layout={{ ...base, barmode: "group", autosize: true, height: 300, margin: { l: 50, r: 20, t: 10, b: 45 }, yaxis: { title: { text: "Seconds per run" }, ...grid }, xaxis: grid, legend: { orientation: "h", y: -0.25 } }}
          config={{ displayModeBar: false }} style={{ width: "100%" }}
        />
        <Cap>Both grow roughly linearly with problem size. NSGA-II is {Math.round(Math.min(...scalGap) * 100)}–{Math.round(Math.max(...scalGap) * 100)}% faster at every size tested.</Cap>
      </Card>

      <H n="4" t="Prediction accuracy" s="Quantum-inspired tuned physics+GBM against conventional predictors, on 10 voyage-grouped train/test splits (no voyage appears in both)." />
      <Card className="mb-6 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="text-left font-mono text-[11px] text-paper/50"><th className="py-2 px-2">Model</th><th>MAPE %</th><th>± sd</th><th>RMSE (t/day)</th><th>R²</th><th>Fit time (s)</th></tr></thead>
          <tbody>
            {accSorted.map((r) => (
              <tr key={r.name} className={`border-t rule ${r.mape === bestMape ? "text-brass-bright" : ""}`}>
                <td className="py-2 px-2">{r.name}</td><td className="font-mono">{r.mape.toFixed(3)}</td><td className="font-mono">{r.sd.toFixed(3)}</td><td className="font-mono">{r.rmse.toFixed(3)}</td><td className="font-mono">{r.r2.toFixed(4)}</td><td className="font-mono">{r.fitS.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Cap>
          The quantum-inspired tuned model has the lowest mean error ({bestMape.toFixed(3)}%), but its edge over the hand-set model is small ({Math.abs(tHand.diff).toFixed(3)} points, better on {tHand.wins} of {tHand.n} splits, p = {tHand.p}, not significant at 0.05) and it is
          indistinguishable from random-search tuning with the same budget (p = {tRand.p}). The large, significant gain comes from the physics prior: {Math.abs(tLgb.diff).toFixed(2)} points better than plain LightGBM, on {tLgb.wins} of {tLgb.n} splits (p = {tLgb.p}).
          Data is synthetic, so this measures the learning step, not real-world accuracy.
        </Cap>
      </Card>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <p className="text-sm text-paper/70 mb-2 px-2">MAPE per split (%)</p>
          <Plot
            data={Object.entries(ACC.perSplit).map(([k, v]) => ({ type: "box", y: [...v], name: k.replace("Physics + GBM", "P+GBM").replace(" (direct, no physics)", "").replace(" (calibrated)", ""), boxpoints: "all", jitter: 0.4, pointpos: 0, marker: { size: 4 } }))}
            layout={{ ...base, autosize: true, height: 340, margin: { l: 45, r: 10, t: 10, b: 110 }, yaxis: { ...grid, type: "log" }, xaxis: { ...grid, tickangle: -35 }, showlegend: false }}
            config={{ displayModeBar: false }} style={{ width: "100%" }}
          />
          <Cap>Log scale. Physics alone is far worse; every learned model is within a narrow band.</Cap>
        </Card>
        <Card>
          <p className="text-sm text-paper/70 mb-2 px-2">Model-tuning search: QIEA vs random search (same {ACC.tuned.evals} evaluations)</p>
          <Plot
            data={[
              { type: "scatter", mode: "lines", name: "QIEA", x: [...ACC.trace.evals], y: [...ACC.trace.qiea], line: { color: COLORS.QIEA, width: 3 } },
              { type: "scatter", mode: "lines", name: "Random search", x: [...ACC.trace.evals], y: [...ACC.trace.random], line: { color: "#7fb8ff", width: 3, dash: "dot" } },
            ]}
            layout={{ ...base, autosize: true, height: 340, margin: { l: 55, r: 15, t: 10, b: 50 }, xaxis: { title: { text: "Models trained" }, ...grid }, yaxis: { title: { text: "Best validation MAPE (%)" }, ...grid }, legend: { orientation: "h", y: -0.25 } }}
            config={{ displayModeBar: false }} style={{ width: "100%" }}
          />
          <Cap>
            Live model: QIEA selected {ACC.tuned.cols.length} residual features ({ACC.tuned.cols.join(", ")}) and tuned the LightGBM settings. Validation MAPE {ACC.tuned.defaultValMape}% → {ACC.tuned.valMape}%. On this synthetic data the residual is driven by weather, which the search rediscovered.
          </Cap>
        </Card>
      </div>
    </div>
  );
}
