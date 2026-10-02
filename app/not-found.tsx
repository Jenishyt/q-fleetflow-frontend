"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import EmptyState from "@/components/EmptyState";

const quick = [
  { href: "/", label: "Overview" },
  { href: "/predict", label: "Predict" },
  { href: "/optimize", label: "Run optimizer" },
  { href: "/map", label: "Map" },
];

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-brass-bright mb-3">
        Error 404
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
        transition={{ opacity: { duration: 0.5 }, scale: { duration: 0.5 }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
        className="font-display text-8xl font-bold mb-6 bg-gradient-to-br from-[#6D6BFF] via-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent"
      >
        404
      </motion.h1>
      <EmptyState
        title="This route isn't on our chart"
        description="The page you're looking for doesn't exist, or the link points at a run that was never created."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            {quick.map((q) => (
              <Link key={q.href} href={q.href}>
                <motion.span
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-block border rule rounded-sm px-4 py-2 text-sm text-paper/80 hover:text-paper hover:border-brass"
                >
                  {q.label}
                </motion.span>
              </Link>
            ))}
          </div>
        }
      />
    </div>
  );
}
