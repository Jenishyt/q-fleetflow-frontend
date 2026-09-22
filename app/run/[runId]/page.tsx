"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { api, ParetoPoint, LedgerResponse } from "@/lib/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function RunExplorerPage() {
  const params = useParams<{ runId: string }>();
  const [front, setFront] = useState<ParetoPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);

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
      <h1 className="font-display text-3xl mb-8">Pareto explorer</h1>

      <div className="grid md:grid-cols-[1.4fr_1fr] gap-10">
        <div className="border rule rounded-sm bg-ink-raised p-2">
          <Plot
            data={[
              {
                type: "scatter3d",
                mode: "markers",
                x: front.map((p) => p.J1_cost_usd),
                y: front.map((p) => p.J2_ghg_intensity),
                z: front.map((p) => p.J3_schedule_risk),
                text: front.map((p) => p.plan_id),
                marker: {
                  size: 6,
                  color: front.map((p) => (p.fueleu_compliant ? "#4a7c59" : "#c4553d")),
                },
              } as any,
            ]}
            layout={{
              autosize: true,
              height: 480,
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
              if (idx != null) setSelectedPlan(front[idx].plan_id);
            }}
          />
          <p className="text-xs text-paper/40 px-3 pb-2 font-mono">
            green = FuelEU compliant, rust = non-compliant. Click a point to inspect it.
          </p>
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
