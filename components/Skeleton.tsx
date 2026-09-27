"use client";

import { motion } from "framer-motion";

export default function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-sm bg-paper/5 ${className}`}>
      <motion.div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, transparent, rgba(231,228,214,0.08), transparent)" }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
      />
    </div>
  );
}
