"use client";

import { motion } from "framer-motion";

export default function EmptyState({
  title, description, action,
}: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border border-dashed rule rounded-sm px-6 py-10 text-center bg-ink-raised/40"
    >
      <svg viewBox="0 0 120 32" className="w-28 h-8 mx-auto mb-4" fill="none">
        <motion.path
          d="M2,16 C14,2 22,30 34,16 C46,2 54,30 66,16 C78,2 86,30 98,16 C104,9 110,12 118,16"
          stroke="#b8863b" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.3 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
      <p className="font-display text-lg mb-1">{title}</p>
      <p className="text-sm text-paper/50 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
