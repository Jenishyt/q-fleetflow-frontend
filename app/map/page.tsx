"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const MapClient = dynamic(() => import("@/components/MapClient"), { ssr: false });

export default function MapPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-brass-bright mb-3">
        GIS route intelligence
      </motion.p>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl mb-2">
        Route map
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="text-paper/60 text-sm mb-8 max-w-xl"
      >
        The 3 routes the optimizer plans across, with real port coordinates and UN/LOCODEs
        — not decorative markers, these tie directly to configs/scenario.yaml.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <MapClient />
      </motion.div>
    </div>
  );
}
