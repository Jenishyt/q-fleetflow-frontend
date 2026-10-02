"use client";

import { motion } from "framer-motion";
import TiltCard from "@/components/TiltCard";

const roadmap = [
  {
    title: "Vessel navigation cockpit",
    desc: "Live heading, speed-over-ground, and ETA tracking per vessel.",
    blocker: "Needs a real AIS/telemetry feed — we won't simulate fake ship positions.",
  },
  {
    title: "Land & multi-modal logistics",
    desc: "EV and hydrogen truck route optimization alongside sea legs, for door-to-door carbon accounting.",
    blocker: "Requires real road-freight cost/emissions data to extend the optimizer's encoding.",
  },
  {
    title: "Risk intelligence",
    desc: "Geopolitical, piracy, and weather risk scoring per route.",
    blocker: "Static, indicative advisory + emission-control zones now ship on the map. Live threat scoring still needs a licensed feed.",
  },
  {
    title: "Satellite & GIS overlay",
    desc: "Live sea-state and vessel-position imagery layered on the route map.",
    blocker: "Satellite basemap, nautical seamarks and live rain radar are on the map. Live sea-state / vessel-position imagery still needs a paid imagery or AIS API.",
  },
  {
    title: "Unified report rollup",
    desc: "One-click JSON export combining every module's output into a single stakeholder report.",
    blocker: "Currently per-plan PDF only — the cross-module rollup format isn't built yet.",
  },
  {
    title: "Real Kaggle fleet telemetry",
    desc: "Training the prediction engine on live AIS-derived fuel/speed data instead of synthetic data.",
    blocker: "The dataset we tested lacked a speed field — see chat for the honest sanity-check results.",
  },
];

export default function RoadmapPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-brass-bright mb-3">
        Roadmap
      </motion.p>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl mb-2">
        Coming soon
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="text-paper/60 text-sm mb-10 max-w-xl"
      >
        Named honestly: each of these needs a real data source we don't have yet.
        We'd rather show you the plan than fake the feature.
      </motion.p>

      <div className="grid md:grid-cols-2 gap-5">
        {roadmap.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <TiltCard className="border border-dashed rule rounded-sm p-5 h-full bg-ink-raised/50">
              <div className="flex items-center justify-between mb-2">
                <p className="font-display text-lg">{item.title}</p>
                <span className="text-[10px] font-mono text-paper/40 border rule rounded-full px-2 py-0.5 shrink-0 ml-2">
                  planned
                </span>
              </div>
              <p className="text-sm text-paper/70 mb-3">{item.desc}</p>
              <p className="text-xs text-paper/40 italic">{item.blocker}</p>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
