"use client";

import { useEffect } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

/** Site-wide atmosphere: drifting aurora + chart grid, scroll-progress line, and a cursor-follow spotlight for any `.spot` card. */
export default function Ambient() {
  const { scrollYProgress } = useScroll();
  const sx = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.2 });

  useEffect(() => {
    const on = (e: MouseEvent) => {
      const t = (e.target as HTMLElement | null)?.closest?.(".spot") as HTMLElement | null;
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", `${e.clientX - r.left}px`);
      t.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("mousemove", on, { passive: true });
    return () => window.removeEventListener("mousemove", on);
  }, []);

  return (
    <>
      <motion.div style={{ scaleX: sx }} className="fixed top-0 left-0 right-0 h-[2px] origin-left z-[1100] bg-gradient-to-r from-brass via-brass-bright to-[#7C3AED]" />
      <div aria-hidden className="ambient"><i /><i /><i /></div>
    </>
  );
}
