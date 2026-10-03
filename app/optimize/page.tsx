"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api, OptimizeResponse, ParetoPoint } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Celebration from "@/components/Celebration";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import BackendOffline, { isOffline } from "@/components/BackendOffline";

type SortKey = "cost" | "ghg" | "risk" | "compliant";

const GETTERS: Record<SortKey, (p: ParetoPoint) => number> = {
  cost: (p) => p.J1_cost_usd,
  ghg: (p) => p.J2_ghg_intensity,
  risk: (p) => p.J3_schedule_risk,
  compliant: (p) => (p.fueleu_compliant ? 1 : 0),
};

const norm = (v: number, min: number, max: number) => (max === min ? 0.5 : (v - min) / (max - min));

export default function OptimizePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [nPop, setNPop] = useState(40);
  const [nGen, setNGen] = useState(150);
  const [seed, setSeed] = useState(42);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [celebrate, setCelebrate] = useState(0);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setOffline(false);
    setResult(null);
    try {
      const res = await api.optimize({ n_pop: nPop, n_generations: nGen, seed });
      setResult(res);
      const compliant = res.pareto_front.filter((p) => p.fueleu_compliant).length;
      toast(`Run ${res.run_id} complete: ${res.pareto_front.length} plans, ${compliant} compliant`, "success");
      if (compliant > 0) setCelebrate((c) => c + 1);
    } catch (e) {
      if (isOffline(e)) { setOffline(true); toast("Backend not connected", "error"); return; }
      const msg = e instanceof Error ? `${e.message} — is the API running and reachable? Check NEXT_PUBLIC_API_URL.` : "Unknown error";
      setError(msg);
      toast("Optimizer run failed — see details below", "error");
    } finally {
      setLoading(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const rows = useMemo(() => {
    if (!result) return [];
    const get = GETTERS[sortKey];
    return [...result.pareto_front].sort((a, b) => (get(a) - get(b)) * (sortDir === "asc" ? 1 : -1));
  }, [result, sortKey, sortDir]);

  const ranges = useMemo(() => {
    const f = result?.pareto_front ?? [];
    const rng = (get: (p: ParetoPoint) => number) => {
      const v = f.map(get);
      return { min: Math.min(...v), max: Math.max(...v) };
    };
    return { cost: rng(GETTERS.cost), ghg: rng(GETTERS.ghg), risk: rng(GETTERS.risk) };
  }, [result]);

  const cheapestCompliant = useMemo(() => {
    const c = (result?.pareto_front ?? []).filter((p) => p.fueleu_compliant);
    return c.length ? c.reduce((a, b) => (a.J1_cost_usd <= b.J1_cost_usd ? a : b)) : null;
  }, [result]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <Celebration trigger={celebrate} />

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-brass-bright mb-3">
        QIEA optimizer
      </motion.p>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl mb-8">
        Run the fleet optimizer
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="text-paper/60 text-sm mb-6 max-w-2xl"
      >
        Runs the Q-bit register optimizer end to end and returns every non-dominated
        trade-off plan it found — not one "best" answer, but the full frontier of
        cost-vs-emissions-vs-schedule options.
      </motion.p>

      <details className="mb-8 group">
        <summary className="text-xs text-brass-bright cursor-pointer select-none">
          What do these inputs and outputs mean?
        </summary>
        <div className="mt-3 grid md:grid-cols-2 gap-6 text-xs text-paper/60 border rule rounded-sm p-4 bg-ink-raised/50">
          <div>
            <p className="text-paper/80 mb-1 font-medium">Inputs</p>
            <p><b>Population</b> — how many candidate fleet plans are evaluated per generation. Higher = more thorough search, slower run.</p>
            <p className="mt-1"><b>Generations</b> — how many rounds of improvement the optimizer runs. Higher = more time to converge.</p>
            <p className="mt-1"><b>Seed</b> — fixes the random number sequence so the same seed always reproduces the same result.</p>
          </div>
          <div>
            <p className="text-paper/80 mb-1 font-medium">Outputs (per plan)</p>
            <p><b>Cost</b> — total fuel + EU ETS carbon cost in USD for that plan.</p>
            <p className="mt-1"><b>GHG intensity</b> — well-to-wake carbon intensity in gCO2e/MJ, checked against the FuelEU Maritime limit.</p>
            <p className="mt-1"><b>Schedule risk</b> — hours a plan's voyages exceed the weekly sailing window (cost-equivalent).</p>
            <p className="mt-1"><b>Compliant</b> — whether that plan's GHG intensity is under the year's FuelEU limit.</p>
          </div>
        </div>
      </details>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        <Field label="Population" value={nPop} onChange={setNPop} min={4} max={200} />
        <Field label="Generations" value={nGen} onChange={setNGen} min={10} max={1000} />
        <Field label="Seed" value={seed} onChange={setSeed} min={0} max={9999} />
      </motion.div>

      <motion.button
        onClick={handleRun}
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.03 }}
        whileTap={{ scale: loading ? 1 : 0.97 }}
        className="bg-brass text-ink px-5 py-2.5 rounded-sm font-medium text-sm disabled:opacity-60 relative overflow-hidden"
      >
        {loading && (
          <motion.span
            className="absolute inset-0 bg-brass-bright"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
            style={{ width: "40%" }}
          />
        )}
        <span className="relative">{loading ? "Running..." : "Run optimizer"}</span>
      </motion.button>

      <p className="mt-4 text-[11px] text-paper/40 max-w-xl">Scenario distances (500 / 800 / 350 nm for Chennai→Colombo / Singapore / Cochin) are stylised planning inputs from scenario.yaml, not measured sea routes. The map shows measured lane distances.</p>

      {offline && <div className="mt-6"><BackendOffline what="The optimizer" onOnline={() => setOffline(false)} /></div>}

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mt-6 text-sm text-alert border border-alert/40 rounded-sm px-4 py-3"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-10">
        {loading && (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}

        {!loading && !result && !error && !offline && (
          <EmptyState
            title="No run yet"
            description="Set population, generations and a seed above, then run. Results land here as a sortable Pareto table."
          />
        )}

        {result && !loading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <p className="text-sm text-paper/60">
                Run <span className="font-mono text-paper">{result.run_id}</span> complete in{" "}
                <span className="font-mono text-paper">{result.elapsed_s.toFixed(1)}s</span> —{" "}
                {result.pareto_front.length} Pareto-optimal plans
              </p>
              <motion.button
                whileHover={{ x: 3 }}
                onClick={() => router.push(`/run/${result.run_id}`)}
                className="text-sm text-brass-bright hover:text-brass transition-colors"
              >
                Open explorer →
              </motion.button>
            </div>

            {cheapestCompliant && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
                className="mb-4 border rounded-sm px-4 py-3 text-sm flex items-center gap-3"
                style={{ borderColor: "#4a7c59", background: "rgba(74,124,89,0.08)" }}
              >
                <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
                <span className="text-paper/80">
                  Cheapest compliant plan: <b className="font-mono text-paper">{cheapestCompliant.plan_id}</b> at{" "}
                  <b className="font-mono text-paper">${cheapestCompliant.J1_cost_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b>
                </span>
              </motion.div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b rule text-left text-paper/50 font-mono text-xs">
                    <th className="py-2 font-normal">Plan</th>
                    <SortTh label="Cost" k="cost" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh label="GHG intensity" k="ghg" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh label="Schedule risk" k="risk" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh label="Compliant" k="compliant" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {rows.map((p, i) => (
                    <motion.tr
                      key={p.plan_id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.6), duration: 0.3, layout: { type: "spring", stiffness: 380, damping: 34 } }}
                      onClick={() => router.push(`/run/${result.run_id}?plan=${p.plan_id}`)}
                      className="border-b rule/50 row-hover cursor-pointer"
                    >
                      <td className="py-2.5 text-paper/70 pr-4">{p.plan_id}</td>
                      <td className="py-2.5 pr-6 min-w-[120px]">
                        ${p.J1_cost_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <MiniBar value={norm(p.J1_cost_usd, ranges.cost.min, ranges.cost.max)} color="#d2a35c" />
                      </td>
                      <td className="py-2.5 pr-6 min-w-[100px]">
                        {p.J2_ghg_intensity.toFixed(2)}
                        <MiniBar value={norm(p.J2_ghg_intensity, ranges.ghg.min, ranges.ghg.max)} color="#33b5e5" />
                      </td>
                      <td className="py-2.5 pr-6 min-w-[100px]">
                        {p.J3_schedule_risk.toFixed(1)}
                        <MiniBar value={norm(p.J3_schedule_risk, ranges.risk.min, ranges.risk.max)} color="#7C3AED" />
                      </td>
                      <td className={p.fueleu_compliant ? "text-signal" : "text-alert"}>
                        {p.fueleu_compliant ? "yes" : "no"}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-paper/40 mt-3">
              Click a column header to sort. Thin bars show where each value sits within this run's range (short = lowest, long = highest). Click a row to open it in the explorer.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SortTh({
  label, k, sortKey, sortDir, onSort,
}: { label: string; k: SortKey; sortKey: SortKey; sortDir: "asc" | "desc"; onSort: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <th className="py-2 font-normal">
      <button onClick={() => onSort(k)} className={`flex items-center gap-1 hover:text-paper transition-colors ${active ? "text-brass-bright" : ""}`}>
        {label}
        <motion.span animate={{ rotate: active && sortDir === "desc" ? 180 : 0, opacity: active ? 1 : 0.25 }} className="inline-block text-[9px]">
          ▲
        </motion.span>
      </button>
    </th>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-[3px] w-full bg-paper/10 rounded-full mt-1 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(8, value * 100)}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ background: color }}
        className="h-full rounded-full"
      />
    </div>
  );
}

function Field({
  label, value, onChange, min, max,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <label className="block">
      <span className="block text-xs text-paper/50 mb-1.5 font-mono">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-ink-raised border rule rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-brass transition-colors"
      />
    </label>
  );
}
