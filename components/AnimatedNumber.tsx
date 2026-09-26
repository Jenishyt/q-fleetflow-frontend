"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

export default function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.2,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) =>
    prefix + v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
  );
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      // subsequent value changes still animate, just don't re-trigger the initial delay
      const controls = animate(motionVal, value, { duration: duration * 0.6, ease: "easeOut" });
      return controls.stop;
    }
    hasAnimated.current = true;
    const controls = animate(motionVal, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
}
