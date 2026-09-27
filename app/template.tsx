"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Quick brand-flash echoing the boot preloader's identity, without
          replaying the full multi-language sequence on every navigation -
          that would make routing feel slow. Fades out fast (250ms). */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="fixed inset-0 z-[998] bg-black flex items-center justify-center pointer-events-none"
      >
        <span className="text-2xl font-bold bg-gradient-to-br from-[#6D6BFF] via-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
          Q-FleetFlow
        </span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
