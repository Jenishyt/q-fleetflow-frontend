"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* brass wipe across the top edge on every navigation */}
      <motion.div
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ scaleX: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }, opacity: { delay: 0.35, duration: 0.25 } }}
        className="fixed top-[60px] left-0 right-0 h-[2px] origin-left z-[998] pointer-events-none bg-gradient-to-r from-transparent via-brass-bright to-transparent"
      />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
