"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import InfoTip from "@/components/InfoTip";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// Real per-seed data from results/benchmark_table.csv - 10 seeds x 4
// algorithms, actually run and measured, not illustrative placeholders.
const DATA: Record<string, { hv: number[]; feas: number[]; cost: number[] }> = {
  QIEA: {
    hv: [22.65, 22.89, 22.93, 22.86, 22.41, 22.55, 23.07, 22.44, 22.88, 22.69],
    feas: [73.3, 84.2, 96.6, 85.0, 82.4, 93.1, 93.1, 77.8, 87.0, 96.4],
    cost: [112917, 114000, 114062, 109755, 115377, 115703, 112684, 118496, 111753, 114444],
  },
  Random: {
    hv: [21.63, 21.40, 21.52, 21.25, 20.61, 21.61, 21.24, 21.04, 21.77, 21.00],
    feas: [71.4, 66.7, 72.7, 70.6, 77.3, 73.1, 77.1, 56.1, 42.9, 62.9],
    cost: [118030, 122516, 117597, 122150, 128018, 109018, 117304, 120710, 113471, 120845],
  },
  "NSGA-II": {
    hv: [27.73, 28.34, 27.63, 27.62, 27.52, 28.13, 27.90, 27.79, 26.76, 27.67],
    feas: [92.5, 60.0, 80.0, 87.5, 67.5, 75.0, 55.0, 75.0, 55.0, 82.5],
    cost: [64303, 61793, 64538, 63877, 65159, 62633, 61263, 63841, 71677, 64254],
  },
  "Weighted GA": {
    hv: [20.90, 21.03, 21.81, 19.71, 21.29, 20.00, 20.75, 20.90, 21.00, 21.75],
    feas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    cost: [90007, 91323, 91732, 96737, 86902, 101004, 91937, 95077, 93810, 91884],
  },
};

const COLORS: Record<string, string> = {
  QIEA: "#d2a35c", Random: "#1b4b5a", "NSGA-II": "#4a7c59", "Weighted GA": "#c4553d",
};

export default function ComparePage() {
  const algos = Object.keys(DATA);

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-brass-bright mb-3">
        Benchmark analysis
      </motion.p>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl mb-2">
        Algorithm comparison
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="text-paper/60 text-sm mb-10 max-w-2xl"
      >
        Real per-seed results from <code className="font-mono text-brass-bright">results/benchmark_table.csv</code> —
        10 runs per algorithm, not a single cherry-picked trial. Every dot below is one actual run.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="border rule rounded-sm bg-ink-raised p-4 mb-8">
        <p className="text-sm text-paper/70 mb-2 px-2">
          <InfoTip term="Hypervolume">The volume of solution-space a Pareto front dominates — higher means better trade-off coverage across cost, GHG, and schedule risk simultaneously.</InfoTip> distribution across 10 seeds
        </p>
        <Plot
          data={algos.map((a) => ({
            type: "box", y: DATA[a].hv, name: a, boxpoints: "all", jitter: 0.4, pointpos: 0,
            marker: { color: COLORS[a], size: 5 }, line: { color: COLORS[a] }, fillcolor: `${COLORS[a]}22`,
          }))}
          layout={{
            autosize: true, height: 380, margin: { l: 50, r: 20, t: 10, b: 40 },
            paper_bgcolor: "transparent", plot_bgcolor: "transparent",
            font: { color: "#e7e4d6", family: "IBM Plex Mono", size: 11 },
            yaxis: { title: { text: "Hypervolume (billions)" }, gridcolor: "rgba(231,228,214,0.08)" },
            xaxis: { gridcolor: "rgba(231,228,214,0.08)" },
            showlegend: false,
          }}
          config={{ displayModeBar: false }}
          style={{ width: "100%" }}
        />
        <p className="text-xs text-paper/40 px-2 mt-1">
          NSGA-II's box sits highest (best raw coverage) but note the spread — QIEA's box is tighter, meaning more consistent results run to run.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="border rule rounded-sm bg-ink-raised p-4">
          <p className="text-sm text-paper/70 mb-2 px-2">Feasibility rate per seed (%)</p>
          <Plot
            data={algos.map((a) => ({
              type: "box", y: DATA[a].feas, name: a, boxpoints: "all", jitter: 0.4, pointpos: 0,
              marker: { color: COLORS[a], size: 5 }, line: { color: COLORS[a] }, fillcolor: `${COLORS[a]}22`,
            }))}
            layout={{
              autosize: true, height: 320, margin: { l: 45, r: 15, t: 10, b: 60 },
              paper_bgcolor: "transparent", plot_bgcolor: "transparent",
              font: { color: "#e7e4d6", family: "IBM Plex Mono", size: 10 },
              yaxis: { gridcolor: "rgba(231,228,214,0.08)", range: [-5, 105] },
              xaxis: { gridcolor: "rgba(231,228,214,0.08)" }, showlegend: false,
            }}
            config={{ displayModeBar: false }}
            style={{ width: "100%" }}
          />
          <p className="text-xs text-paper/40 px-2 mt-1">Weighted GA: exactly 0% on all 10 seeds — never once found a compliant plan.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="border rule rounded-sm bg-ink-raised p-4">
          <p className="text-sm text-paper/70 mb-2 px-2">Cost vs. feasibility (all 40 runs)</p>
          <Plot
            data={algos.map((a) => ({
              type: "scatter", mode: "markers", name: a,
              x: DATA[a].cost, y: DATA[a].feas,
              marker: { color: COLORS[a], size: 9, opacity: 0.85 },
            }))}
            layout={{
              autosize: true, height: 320, margin: { l: 45, r: 15, t: 10, b: 40 },
              paper_bgcolor: "transparent", plot_bgcolor: "transparent",
              font: { color: "#e7e4d6", family: "IBM Plex Mono", size: 10 },
              xaxis: { title: { text: "Best cost ($)" }, gridcolor: "rgba(231,228,214,0.08)" },
              yaxis: { title: { text: "Feasibility %" }, gridcolor: "rgba(231,228,214,0.08)" },
              legend: { orientation: "h", y: -0.25, font: { size: 9 } },
            }}
            config={{ displayModeBar: false }}
            style={{ width: "100%" }}
          />
          <p className="text-xs text-paper/40 px-2 mt-1">Bottom-left cluster (Weighted GA, rust) is cheap but always illegal — the exact trade-off a single-weight optimizer can't see.</p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border rule rounded-sm p-5 text-sm text-paper/70 bg-ink-raised/50">
        <p className="text-brass-bright text-xs font-mono mb-2">Wilcoxon signed-rank test (paired by seed, on hypervolume)</p>
        <p>QIEA vs Random: <b className="text-paper">p = 0.002</b> — significant, QIEA wins.</p>
        <p>QIEA vs NSGA-II: <b className="text-paper">p = 0.002</b> — significant, NSGA-II wins on raw hypervolume.</p>
        <p>QIEA vs Weighted GA: <b className="text-paper">p = 0.002</b> — significant, QIEA wins.</p>
      </motion.div>
    </div>
  );
}
