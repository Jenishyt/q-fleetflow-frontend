"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#d2a35c", "#4a7c59", "#7C3AED", "#33b5e5", "#e7e4d6"];

/** Brief particle burst + expanding ring. Bump `trigger` to replay. */
export default function Celebration({ trigger }: { trigger: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        angle: (i / 30) * Math.PI * 2 + Math.random() * 0.35,
        dist: 110 + Math.random() * 150,
        size: 4 + Math.random() * 5,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.08,
        square: i % 3 === 0,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger]
  );

  if (trigger === 0) return null;

  return (
    <div key={trigger} className="pointer-events-none fixed inset-0 z-[990] flex items-center justify-center">
      <motion.span
        initial={{ scale: 0, opacity: 0.6 }}
        animate={{ scale: 5, opacity: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="absolute w-24 h-24 rounded-full border-2"
        style={{ borderColor: "#d2a35c" }}
      />
      {particles.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(p.angle) * p.dist, y: Math.sin(p.angle) * p.dist, opacity: 0, scale: 0.4, rotate: 180 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: p.delay }}
          className="absolute"
          style={{ width: p.size, height: p.size, background: p.color, borderRadius: p.square ? 2 : 999 }}
        />
      ))}
    </div>
  );
}
