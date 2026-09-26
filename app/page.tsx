"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import AnimatedNumber from "@/components/AnimatedNumber";

const benchmarkRows = [
  { algo: "Greedy heuristic", hv: 10.7, feas: 0, cost: 142551 },
  { algo: "Random search", hv: 21.3, feas: 67.1, cost: 109018 },
  { algo: "QIEA (ours)", hv: 22.7, feas: 86.9, cost: 109755, highlight: true },
  { algo: "NSGA-II", hv: 27.7, feas: 73.0, cost: 61263 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.08 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function OverviewPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-14 relative">
      <DepthLine />

      <div className="grid md:grid-cols-[1.3fr_1fr] gap-12 items-start relative">
        <motion.div initial="hidden" animate="show" custom={0} variants={fadeUp}>
          <p className="font-mono text-xs text-brass-bright mb-3">Quantum-inspired optimization, laptop-scale</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.08] mb-5">
            Fuel prediction and fleet optimization for a decarbonizing shipping industry.
          </h1>
          <p className="text-paper/70 text-lg leading-relaxed max-w-xl">
            A physics-anchored prediction engine and a Q-bit register optimizer plan vessel
            speed, fuel, and capacity against real FuelEU, EU ETS, and IMO CII limits —
            benchmarked honestly against NSGA-II, not just against a strawman.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/optimize">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block bg-brass text-ink px-5 py-2.5 rounded-sm font-medium text-sm cursor-pointer"
              >
                Run the optimizer
              </motion.span>
            </Link>
            <Link href="/predict">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block border rule px-5 py-2.5 rounded-sm font-medium text-sm cursor-pointer text-paper/80 hover:text-paper hover:border-paper/40"
              >
                Try a live prediction
              </motion.span>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial="hidden" animate="show" custom={1} variants={fadeUp}
          className="border rule rounded-sm p-6 bg-ink-raised"
        >
          <p className="font-mono text-[11px] text-paper/50 mb-4">10-seed benchmark, Wilcoxon-tested</p>
          <div className="space-y-4">
            {benchmarkRows.map((r, i) => (
              <motion.div
                key={r.algo}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.09, duration: 0.4 }}
                className={`pb-4 ${r.algo !== "NSGA-II" ? "border-b rule" : ""}`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className={`text-sm ${r.highlight ? "text-brass-bright" : "text-paper/80"}`}>{r.algo}</span>
                  <span className="font-mono text-xs text-paper/40">
                    HV <AnimatedNumber value={r.hv} decimals={1} suffix="B" />
                  </span>
                </div>
                <div className="flex items-baseline gap-4 font-mono text-sm">
                  <span>$<AnimatedNumber value={r.cost} /></span>
                  <span className="text-paper/50 text-xs">
                    <AnimatedNumber value={r.feas} decimals={1} suffix="%" /> feasible
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="mt-20 grid md:grid-cols-3 gap-8 border-t rule pt-10">
        {[
          {
            title: "Prediction engine", color: "text-depth",
            body: "Admiralty cubic law prior, corrected by a LightGBM residual on the log-ratio. 3.33% MAPE, R²=0.996 on held-out voyages, 12.7ms per 100-row batch.",
          },
          {
            title: "Compliance engine", color: "text-depth",
            body: "FuelEU well-to-wake intensity, EU ETS phase-in cost, IMO CII rating bands. Every emission factor is sourced or explicitly flagged as an assumption.",
          },
          {
            title: "Honest benchmarking", color: "text-depth",
            body: "NSGA-II wins on raw hypervolume (p=0.002). QIEA wins on feasibility rate (p=0.002) — repair-first constraint handling trades exploration for legality.",
          },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className={`font-mono text-xs ${card.color} mb-2`}>{card.title}</p>
            <p className="text-sm text-paper/70 leading-relaxed">{card.body}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** A faint animated sounding-line trace across the hero, evoking a
 * depth-chart readout — reinforces the marine-instrument identity instead
 * of a generic gradient blob, and moves subtly rather than sitting static. */
function DepthLine() {
  return (
    <svg
      className="absolute -top-6 left-0 w-full h-32 opacity-[0.15] pointer-events-none"
      viewBox="0 0 1000 120"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M0,60 C100,20 150,100 250,60 C350,20 400,90 500,55 C600,20 650,95 750,55 C850,15 900,80 1000,50"
        fill="none"
        stroke="#b8863b"
        strokeWidth="1"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2.2, ease: "easeInOut" }}
      />
    </svg>
  );
}
