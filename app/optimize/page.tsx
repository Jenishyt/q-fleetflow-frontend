"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, OptimizeResponse } from "@/lib/api";

export default function OptimizePage() {
  const router = useRouter();
  const [nPop, setNPop] = useState(40);
  const [nGen, setNGen] = useState(150);
  const [seed, setSeed] = useState(42);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeResponse | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.optimize({ n_pop: nPop, n_generations: nGen, seed });
      setResult(res);
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} — is the API running and reachable? Check NEXT_PUBLIC_API_URL.`
          : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <p className="font-mono text-xs text-brass-bright mb-3">QIEA optimizer</p>
      <h1 className="font-display text-3xl mb-8">Run the fleet optimizer</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Field label="Population" value={nPop} onChange={setNPop} min={4} max={200} />
        <Field label="Generations" value={nGen} onChange={setNGen} min={10} max={1000} />
        <Field label="Seed" value={seed} onChange={setSeed} min={0} max={9999} />
      </div>

      <button
        onClick={handleRun}
        disabled={loading}
        className="bg-brass text-ink px-5 py-2.5 rounded-sm font-medium text-sm hover:bg-brass-bright transition-colors disabled:opacity-50"
      >
        {loading ? "Running..." : "Run optimizer"}
      </button>

      {error && (
        <p className="mt-6 text-sm text-alert border border-alert/40 rounded-sm px-4 py-3">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-10">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-sm text-paper/60">
              Run <span className="font-mono text-paper">{result.run_id}</span> complete in{" "}
              <span className="font-mono text-paper">{result.elapsed_s.toFixed(1)}s</span> —{" "}
              {result.pareto_front.length} Pareto-optimal plans
            </p>
            <button
              onClick={() => router.push(`/run/${result.run_id}`)}
              className="text-sm text-brass-bright hover:text-brass transition-colors"
            >
              Open explorer
            </button>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b rule text-left text-paper/50 font-mono text-xs">
                <th className="py-2 font-normal">Plan</th>
                <th className="py-2 font-normal">Cost</th>
                <th className="py-2 font-normal">GHG intensity</th>
                <th className="py-2 font-normal">Schedule risk</th>
                <th className="py-2 font-normal">Compliant</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {result.pareto_front
                .sort((a, b) => a.J1_cost_usd - b.J1_cost_usd)
                .map((p) => (
                  <tr key={p.plan_id} className="border-b rule/50">
                    <td className="py-2 text-paper/70">{p.plan_id}</td>
                    <td className="py-2">${p.J1_cost_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-2">{p.J2_ghg_intensity.toFixed(2)}</td>
                    <td className="py-2">{p.J3_schedule_risk.toFixed(1)}</td>
                    <td className={p.fueleu_compliant ? "text-signal" : "text-alert"}>
                      {p.fueleu_compliant ? "yes" : "no"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
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
        className="w-full bg-ink-raised border rule rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-brass"
      />
    </label>
  );
}
