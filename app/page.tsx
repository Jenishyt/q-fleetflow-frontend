"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import AnimatedNumber from "@/components/AnimatedNumber";
import InfoTip from "@/components/InfoTip";
import TiltCard from "@/components/TiltCard";

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
          <h1 className="font-display text-4xl md:text-5xl leading-[1.08] mb-5 text-shine">
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
            <Link href="/map">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block border border-brass/60 text-brass-bright px-5 py-2.5 rounded-sm font-medium text-sm cursor-pointer hover:bg-brass/10"
              >
                Open the route map
              </motion.span>
            </Link>
            <Link href="/roadmap">
              <motion.span
                whileHover={{ scale: 1.03 }}
                className="inline-block px-5 py-2.5 rounded-sm font-medium text-sm cursor-pointer text-paper/50 hover:text-paper/80"
              >
                What&apos;s coming next →
              </motion.span>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial="hidden" animate="show" custom={1} variants={fadeUp}
        >
        <TiltCard className="border rule rounded-sm p-6 bg-ink-raised">
          <p className="font-mono text-[11px] text-paper/50 mb-4">
            10-seed benchmark, Wilcoxon-tested
          </p>
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
                    <InfoTip term="HV">Hypervolume — the volume of solution-space a Pareto front dominates. Higher means more/better trade-off coverage.</InfoTip>{" "}
                    <AnimatedNumber value={r.hv} decimals={1} suffix="B" />
                  </span>
                </div>
                <div className="flex items-baseline gap-4 font-mono text-sm">
                  <span>$<AnimatedNumber value={r.cost} /></span>
                  <span className="text-paper/50 text-xs">
                    <AnimatedNumber value={r.feas} decimals={1} suffix="%" />{" "}
                    <InfoTip term="feasible">Share of this algorithm&apos;s plans that pass the FuelEU Maritime carbon-intensity limit.</InfoTip>
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </TiltCard>
        </motion.div>
      </div>


      <motion.div
        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-20 border rule rounded-sm bg-ink-raised/70 spot grid md:grid-cols-[1fr_1.1fr] overflow-hidden"
      >
        <div className="p-8">
          <p className="font-mono text-xs text-brass-bright mb-3">New · Maritime route map</p>
          <h2 className="font-display text-2xl mb-3">Plan a voyage on a real sea-lane network.</h2>
          <p className="text-sm text-paper/70 leading-relaxed mb-5">
            Pick any two ports, avoid Suez or the Red Sea, and get distance, ETA, fuel, CO₂ and an indicative EU ETS cost — then replay the voyage,
            pin routes side by side, and see which chokepoints and advisory zones you cross.
          </p>
          <div className="flex flex-wrap gap-2">
            {[["Mumbai → Rotterdam", "INBOM", "NLRTM"], ["Singapore → Rotterdam", "SGSIN", "NLRTM"], ["Shanghai → Los Angeles", "CNSHA", "USLAX"]].map(([l, a, b]) => (
              <Link key={l} href={`/map?from=${a}&to=${b}`} className="chip">{l}</Link>
            ))}
          </div>
        </div>
        <div className="relative min-h-[220px] border-t md:border-t-0 md:border-l rule">
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
            <defs><radialGradient id="mg" cx="50%" cy="50%" r="70%"><stop offset="0%" stopColor="#1b4b5a" stopOpacity="0.5" /><stop offset="100%" stopColor="#0b1f2e" stopOpacity="0" /></radialGradient></defs>
            <rect width="400" height="220" fill="url(#mg)" />
            {[...Array(9)].map((_, i) => <line key={`h${i}`} x1="0" x2="400" y1={i * 28} y2={i * 28} stroke="#e7e4d6" strokeOpacity="0.05" />)}
            {[...Array(15)].map((_, i) => <line key={`v${i}`} y1="0" y2="220" x1={i * 28} x2={i * 28} stroke="#e7e4d6" strokeOpacity="0.05" />)}
            <motion.path d="M70,150 C110,170 150,120 200,128 S290,150 330,80" fill="none" stroke="#f4d9a6" strokeWidth="2.2" strokeDasharray="7 6" strokeLinecap="round"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2.2, ease: "easeInOut", delay: 0.3 }} />
            <circle cx="70" cy="150" r="5" fill="#6fd08c" /><circle cx="330" cy="80" r="5" fill="#f08a6b" />
            <circle cx="200" cy="128" r="4" fill="#f4d9a6" stroke="#0b1f2e" strokeWidth="1.5" />
          </svg>
        </div>
      </motion.div>

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
            <TiltCard className="p-5 border rule rounded-sm bg-ink-raised/60 spot">
              <p className={`font-mono text-xs ${card.color} mb-2`}>{card.title}</p>
              <p className="text-sm text-paper/70 leading-relaxed">{card.body}</p>
            </TiltCard>
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
