"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

/** True when a request failed because nothing answered (backend off / unreachable), not because the API returned an error. */
export function isOffline(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  if (e instanceof DOMException && e.name === "AbortError") return true;
  return e instanceof Error && /failed to fetch|networkerror|load failed|network request failed/i.test(e.message);
}

/** Friendly "start the backend" card. Polls /health and calls onOnline as soon as the backend appears. */
export default function BackendOffline({ what, onOnline }: { what: string; onOnline?: () => void }) {
  const cb = useRef(onOnline);
  useEffect(() => { cb.current = onOnline; }, [onOnline]);
  useEffect(() => {
    let alive = true;
    const id = setInterval(() => { api.health().then(() => alive && cb.current?.()).catch(() => {}); }, 2500);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="relative overflow-hidden rounded-sm border border-brass/40 bg-brass/5 p-6 md:p-7 max-w-2xl"
      role="status"
    >
      <div className="flex items-start gap-4">
        <motion.svg viewBox="0 0 48 48" width="44" height="44" className="shrink-0 text-brass-bright" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          animate={{ opacity: [1, 0.55, 1] }} transition={{ repeat: Infinity, duration: 2.2 }} aria-hidden>
          <path d="M17 8v10M31 8v10M12 18h24v6a12 12 0 0 1-24 0z" /><path d="M24 36v6" /><path d="M8 40l32-32" stroke="#e0644a" />
        </motion.svg>
        <div>
          <h3 className="font-display text-xl mb-1">Backend not connected</h3>
          <p className="text-sm text-paper/70 leading-relaxed">
            {what} runs on the Q-FORGE backend, which isn&apos;t reachable right now. Starting it takes about two minutes.
            This page will pick it up automatically once it&apos;s running.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button className="btn-primary" onClick={() => window.dispatchEvent(new Event("open-welcome"))}>Set up the backend</button>
            <Link href="/map" className="btn-ghost">Explore the map meanwhile →</Link>
          </div>
          <p className="flex items-center gap-2 text-[11px] font-mono text-paper/45 mt-4">
            <span className="h-1.5 w-1.5 rounded-full bg-brass animate-pulse" />Listening for a backend on localhost:8000…
          </p>
        </div>
      </div>
    </motion.div>
  );
}
