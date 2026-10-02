"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";

const KEY = "qforge-welcome-v1";
// Put the zipped backend in /public (see DEPLOY notes) or point this env var at a GitHub release / Drive link.
const DOWNLOAD_URL = process.env.NEXT_PUBLIC_BACKEND_DOWNLOAD_URL || "/q-forge-backend.zip";

type Status = "checking" | "online" | "offline";

function useBackendStatus(intervalMs: number, active = true) {
  const [status, setStatus] = useState<Status>("checking");
  useEffect(() => {
    if (!active) return;
    let alive = true;
    const ping = () => api.health().then(() => alive && setStatus("online")).catch(() => alive && setStatus("offline"));
    ping();
    const id = setInterval(ping, intervalMs);
    return () => { alive = false; clearInterval(id); };
  }, [intervalMs, active]);
  return status;
}

/** Small nav pill: shows backend state, click to reopen the welcome/setup dialog. */
export function BackendPill() {
  const status = useBackendStatus(8000);
  const dot = status === "online" ? "bg-signal" : status === "offline" ? "bg-alert" : "bg-brass";
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-welcome"))}
      className="hidden md:flex items-center gap-2 border rule rounded-full px-3 py-1 text-xs text-paper/60 hover:text-paper hover:border-brass transition-colors"
      title="Backend connection"
    >
      <span className={`h-2 w-2 rounded-full ${dot} ${status === "checking" ? "animate-pulse" : ""}`} />
      {status === "online" ? "Backend live" : status === "offline" ? "Frontend only" : "Checking…"}
    </button>
  );
}

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const status = useBackendStatus(2500, open);
  const firstCheck = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    try { localStorage.setItem(KEY, "1"); } catch {}
  }, []);

  // First visit: only interrupt people whose backend is NOT already running.
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch {}
    const reopen = () => setOpen(true);
    window.addEventListener("open-welcome", reopen);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (!seen && !firstCheck.current) {
      firstCheck.current = true;
      api.health().catch(() => { t = setTimeout(() => setOpen(true), 500); });
    }
    return () => { window.removeEventListener("open-welcome", reopen); if (t) clearTimeout(t); };
  }, []);

  // Backend came up while the dialog was open -> confirm, then get out of the way.
  useEffect(() => {
    if (!open || status !== "online") return;
    const t = setTimeout(close, 1600);
    return () => clearTimeout(t);
  }, [open, status, close]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, close]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[1300] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={close} />
          <motion.div
            role="dialog" aria-modal="true" aria-label="Welcome to Q-FORGE"
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-2xl glass rounded-md shadow-2xl p-6 md:p-8 max-h-[92vh] overflow-y-auto"
          >
            <button onClick={close} aria-label="Close" className="absolute top-3 right-4 text-paper/40 hover:text-paper text-xl">×</button>
            <p className="font-mono text-[11px] text-brass-bright mb-2">Welcome, judges</p>
            <h2 className="font-display text-2xl md:text-3xl leading-tight mb-2">Explore Q-FORGE your way.</h2>
            <p className="text-sm text-paper/70 mb-6">
              This site is the front end. The live fuel model, optimizer and fleet registry run on a small backend that
              you can start on your own laptop in about two minutes — or skip it and just look around.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-brass/50 bg-brass/5 rounded-sm p-4 flex flex-col">
                <div className="font-display text-lg mb-1">Full experience</div>
                <div className="space-y-2.5 mb-4">
                  {[
                    <>Download the backend <b className="text-brass-bright">.zip</b> and extract it</>,
                    <>Double-click <code className="bg-brass/20 px-1.5 py-0.5 rounded-sm">setup_and_run.bat</code><span className="block text-paper/50 mt-0.5">Mac/Linux: <code>bash setup_and_run.sh</code></span></>,
                    <>Keep the black window open — this page <b className="text-brass-bright">connects by itself</b></>,
                  ].map((t, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-sm bg-ink/50 border border-brass/25 px-3 py-2">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-brass text-ink text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="text-sm text-paper/90 leading-snug">{t}</span>
                    </div>
                  ))}
                </div>
                <a href={DOWNLOAD_URL} download className="btn-primary text-center mt-auto">⬇ Download backend</a>
                <p className="text-[10px] text-paper/40 mt-2">Needs Python 3.11 or 3.12. Use Chrome, Edge or Firefox (Safari blocks local connections).</p>
              </div>

              <div className="border rule rounded-sm p-4 flex flex-col">
                <div className="font-display text-lg mb-1">Just look around</div>
                <p className="text-xs text-paper/70 mb-2">No install needed. These work right now:</p>
                <ul className="text-xs text-paper/60 space-y-1 mb-2">
                  <li>✓ Overview &amp; benchmark results</li>
                  <li>✓ Interactive sea-route map (routing, ETA, CO₂, cost)</li>
                  <li>✓ Ports database &amp; roadmap</li>
                </ul>
                <p className="text-xs text-paper/50 mb-4">Live prediction, the optimizer and fleet registry need the backend — you can add it any time from the pill in the top bar.</p>
                <button onClick={close} className="btn-ghost mt-auto">Continue without backend</button>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-mono">
              <span className={`h-2 w-2 rounded-full ${status === "online" ? "bg-signal" : "bg-brass animate-pulse"}`} />
              <span className={status === "online" ? "text-signal" : "text-paper/50"}>
                {status === "online" ? "Backend connected — you're all set!" : "Waiting for a backend on localhost:8000…"}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
