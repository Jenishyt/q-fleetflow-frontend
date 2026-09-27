"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function InfoTip({ term, children }: { term: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center gap-1 border-b border-dotted border-paper/30 cursor-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {term}
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 z-50
                       bg-ink-raised border rule rounded-sm px-3 py-2 text-xs text-paper/80
                       leading-relaxed shadow-lg pointer-events-none"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
