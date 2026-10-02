"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GREETINGS = ["Hi", "Hello", "Namaste", "नमस्ते", "Hola", "Bonjour", "Ciao", "Salaam", "こんにちは", "안녕하세요", "Vanakkam", "Namaskar"];
const CYCLE_MS = 180;
const HOLD_BRAND_MS = 900;

export default function Preloader({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"boot" | "done">("boot");
  const [index, setIndex] = useState(0);
  const [showBrand, setShowBrand] = useState(false);

  useEffect(() => {
    // Only play once per browser session - internal nav shouldn't repeat it
    if (typeof window !== "undefined" && sessionStorage.getItem("qff-booted")) {
      setPhase("done");
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      sessionStorage.setItem("qff-booted", "1");
      setPhase("done");
      return;
    }

    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function step() {
      if (i < GREETINGS.length) {
        setIndex(i);
        i += 1;
        timers.push(setTimeout(step, CYCLE_MS));
      } else {
        setShowBrand(true);
        timers.push(setTimeout(() => {
          sessionStorage.setItem("qff-booted", "1");
          setPhase("done");
        }, HOLD_BRAND_MS + 500));
      }
    }
    timers.push(setTimeout(step, 150));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      <AnimatePresence>
        {phase === "boot" && (
          <motion.div
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-[999] bg-ink flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none animate-scan-line" />
            <div className="relative h-24 flex items-center justify-center w-[min(90vw,900px)]">
              <AnimatePresence mode="wait">
                {!showBrand ? (
                  <motion.span
                    key={GREETINGS[index]}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.12 }}
                    className="absolute text-4xl md:text-6xl font-medium text-[#F4F5FA] whitespace-nowrap"
                  >
                    {GREETINGS[index]}
                  </motion.span>
                ) : (
                  <motion.span
                    key="brand"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="absolute text-4xl md:text-6xl font-bold whitespace-nowrap bg-gradient-to-br from-[#6D6BFF] via-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent"
                  >
                    Q-FORGE
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {showBrand && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                  className="absolute bottom-[9vh] text-xs text-[#6B7280] tracking-wide"
                >
                  quantum-inspired fleet intelligence
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
