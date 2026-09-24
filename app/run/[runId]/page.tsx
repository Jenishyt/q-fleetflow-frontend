"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { api, ParetoPoint, LedgerResponse } from "@/lib/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type Filter = "all" | "compliant" | "non-compliant";

export default function RunExplorerPage() {
  const params = useParams<{ runId: string }>();
  const [front, setFront] = useState<ParetoPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<"cost" | "ghg" | "risk">("cost");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/run/${params.runId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data) => {
        setFront(data.pareto_front);
        if (data.pareto_front.length > 0) setSelectedPlan(data.pareto_front[0].plan_id);
      })
      .catch(() => setError("Could not load this run — it may not exist, or the API isn't reachable."));
  }, [params.runId]);

  useEffect(() => {
    if (!selectedPlan) return;
    api.ledger(params.runId, selectedPlan).then(setLedger).catch(() => setLedger(null));
  }, [selectedPlan, params.runId]);

  const filtered = useMemo(() => {
    if (!front) return [];
    if (filter === "all") return front;
    return front.filter((p) => (filter === "compliant" ? p.fueleu_compliant : !p.fueleu_compliant));
  }, [front, filter]);

  const sorted = useMemo(() => {
    const key = sortKey === "cost" ? "J1_cost_usd" : sortKey === "ghg" ? "J2_ghg_intensity" : "J3_schedule_risk";
    return [...filtered].sort((a, b) => a[key] - b[key]);
  }, [filtered, sortKey]);

  const stats = useMemo(() => {
    if (!front || front.length === 0) return null;
    const compliantCount = front.filter((p) => p.fueleu_compliant).length;
    const costs = front.map((p) => p.J1_cost_usd);
    return {
      total: front.length,
      compliantPct: ((compliantCount / front.length) * 100).toFixed(0),
      minCost: Math.min(...costs),
      maxCost: Math.max(...costs),
    };
  }, [front]);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-14">
        <p className="text-alert text-sm">{error}</p>
      </div>
    );
  }

  if (!front) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-14">
        <p className="text-paper/50 text-sm font-mono">Loading run {params.runId}...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <p className="font-mono text-xs text-brass-bright mb-3">Run {params.runId}</p>
      <h1 className="font-display text-3xl mb-6">Pareto explorer</h1>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Plans found" value={`${stats.total}`} />
          <StatCard label="Compliant" value={`${stats.compliantPct}%`} />
          <StatCard label="Cheapest" value={`$${stats.minCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <StatCard label="Most expensive" value={`$${stats.maxCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        </div>
      )}

      <div className="flex items-center gap-6 mb-4">
        <div className="flex gap-1">
          {(["all", "compliant", "non-compliant"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f ? "bg-brass text-ink border-brass" : "border-paper/20 text-paper/60 hover:border-paper/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-paper/50">
          <span>sort by</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            className="bg-ink-raised border rule rounded-sm px-2 py-1 text-paper focus:outline-none focus:border-brass"
          >
            <option value="cost">cost</option>
            <option value="ghg">GHG intensity</option>
            <option value="risk">schedule risk</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-[1.4fr_1fr] gap-10">
        <div className="border rule rounded-sm bg-ink-raised p-2">
          <Plot
            data={[
              {
                type: "scatter3d",
                mode: "markers",
                x: filtered.map((p) => p.J1_cost_usd),
                y: filtered.map((p) => p.J2_ghg_intensity),
                z: filtered.map((p) => p.J3_schedule_risk),
                text: filtered.map((p) => p.plan_id),
                marker: {
                  size: filtered.map((p) => (p.plan_id === selectedPlan ? 11 : 6)),
                  color: filtered.map((p) =>
                    p.plan_id === selectedPlan ? "#d2a35c" : p.fueleu_compliant ? "#4a7c59" : "#c4553d"
                  ),
                  line: filtered.map((p) => (p.plan_id === selectedPlan ? { color: "#e7e4d6", width: 2 } : {})) as any,
                },
              } as any,
            ]}
            layout={{
              autosize: true,
              height: 460,
              margin: { l: 0, r: 0, t: 10, b: 0 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              font: { color: "#e7e4d6", family: "IBM Plex Mono", size: 10 },
              scene: {
                xaxis: { title: { text: "Cost ($)" }, gridcolor: "rgba(231,228,214,0.1)" },
                yaxis: { title: { text: "GHG intensity" }, gridcolor: "rgba(231,228,214,0.1)" },
                zaxis: { title: { text: "Schedule risk" }, gridcolor: "rgba(231,228,214,0.1)" },
              },
            }}
            config={{ displayModeBar: false }}
            style={{ width: "100%" }}
            onClick={(e: any) => {
              const idx = e.points?.[0]?.pointNumber;
              if (idx != null) setSelectedPlan(filtered[idx].plan_id);
            }}
          />
          <p className="text-xs text-paper/40 px-3 pb-2 font-mono">
            green = compliant, rust = non-compliant, gold = selected. Click a point, or a row below, to inspect it.
          </p>

          <div className="max-h-56 overflow-y-auto border-t rule mt-1">
            <table className="w-full text-xs">
              <tbody className="font-mono">
                {sorted.map((p) => (
                  <tr
                    key={p.plan_id}
                    onClick={() => setSelectedPlan(p.plan_id)}
                    className={`cursor-pointer border-b rule/50 hover:bg-paper/5 ${
                      p.plan_id === selectedPlan ? "bg-brass/10" : ""
                    }`}
                  >
                    <td className="py-1.5 px-3 text-paper/60">{p.plan_id}</td>
                    <td className="py-1.5 px-3">${p.J1_cost_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-1.5 px-3">{p.J2_ghg_intensity.toFixed(1)}</td>
                    <td className="py-1.5 px-3">{p.J3_schedule_risk.toFixed(0)}</td>
                    <td className={`py-1.5 px-3 ${p.fueleu_compliant ? "text-signal" : "text-alert"}`}>
                      {p.fueleu_compliant ? "ok" : "no"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <p className="font-mono text-xs text-paper/50 mb-3">
            Inspecting <span className="text-paper">{selectedPlan}</span>
          </p>

          {ledger && (
            <div className="space-y-5">
              <Metric label="Fuel cost" value={`$${ledger.fuel_cost_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
              <Metric label="EU ETS cost" value={`$${ledger.ets_cost_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} note="assumption-based EUA price" />
              <Metric
                label="FuelEU intensity"
                value={`${ledger.fueleu_intensity.toFixed(2)} vs limit ${ledger.fueleu_limit.toFixed(2)}`}
                status={ledger.fueleu_compliant ? "signal" : "alert"}
                statusLabel={ledger.fueleu_compliant ? "compliant" : "non-compliant"}
              />
              <Metric label="Total CO2 (tank-to-wake)" value={`${ledger.total_co2_ttw_t.toFixed(1)} t`} />
              <Metric label="Schedule risk" value={`${ledger.risk_hours.toFixed(1)} hours`} />
              <Metric label="Legs" value={`${ledger.n_legs}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rule rounded-sm bg-ink-raised px-4 py-3">
      <p className="text-[11px] text-paper/50">{label}</p>
      <p className="font-mono text-lg mt-0.5">{value}</p>
    </div>
  );
}

function Metric({
  label, value, note, status, statusLabel,
}: { label: string; value: string; note?: string; status?: "signal" | "alert"; statusLabel?: string }) {
  return (
    <div className="border-b rule pb-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-paper/50">{label}</span>
        {status && (
          <span className={`text-xs font-mono ${status === "signal" ? "text-signal" : "text-alert"}`}>
            {statusLabel}
          </span>
        )}
      </div>
      <p className="font-mono text-sm mt-1">{value}</p>
      {note && <p className="text-xs text-paper/40 mt-0.5">{note}</p>}
    </div>
  );
}
