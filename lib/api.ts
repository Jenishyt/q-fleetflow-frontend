// NOTE: lib/ was not included in the uploaded zip, so this file was reconstructed
// from the backend (src/api/main.py, schemas.py) and from how the pages call it.
// If you still have your original lib/api.ts, diff the two and keep any extras.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Port { name: string; country: string; locode: string; lat: number; lon: number }
export interface RouteGeometry {
  name: string; distance_nm: number; demand_dwt_per_week: number; fuel_availability: string[];
  origin: Port | null; destination: Port | null;
}
export interface Vessel {
  id: string; name: string; vessel_class: string; capacity_dwt: number; design_speed_kn: number;
  engine_power_kw?: number; max_draft_m?: number; fuel_type: string; status: string;
}
export interface ParetoPoint {
  plan_id: string; J1_cost_usd: number; J2_ghg_intensity: number; J3_schedule_risk: number; fueleu_compliant: boolean;
}
export interface OptimizeResponse { run_id: string; n_pop: number; n_generations: number; elapsed_s: number; pareto_front: ParetoPoint[] }
export interface LedgerResponse {
  plan_id: string; fuel_cost_usd: number; ets_cost_usd: number; demand_penalty_usd: number;
  fueleu_intensity: number; fueleu_limit: number; fueleu_compliant: boolean; total_co2_ttw_t: number;
  risk_hours: number; n_legs: number;
}
export interface PredictRequest {
  vessel_class: string; speed_kn: number; draft_ratio: number; wind_kn?: number; wave_hs_m?: number; temp_c?: number; fuel_type?: string;
}
export interface PredictResponse { fuel_t_per_day: number; q10: number; q90: number; shap_top3: [string, number][] }
export interface HealthResponse { status: string; model_version: string; data_hash: string }

async function req<T>(path: string, init?: RequestInit, timeoutMs = 0): Promise<T> {
  const ctrl = timeoutMs ? new AbortController() : null;
  const t = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, signal: ctrl?.signal, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!res.ok) {
      let detail = `${res.status}`;
      try { const j = await res.json(); if (j?.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch {}
      throw new Error(detail);
    }
    return (await res.json()) as T;
  } finally { if (t) clearTimeout(t); }
}

export const api = {
  health: () => req<HealthResponse>("/health", undefined, 4000),
  predict: (body: PredictRequest) => req<PredictResponse>("/predict", { method: "POST", body: JSON.stringify(body) }),
  optimize: (body: { n_pop?: number; n_generations?: number; seed?: number; scenario_path?: string }) =>
    req<OptimizeResponse>("/optimize", { method: "POST", body: JSON.stringify(body) }),
  ledger: (runId: string, planId: string) => req<LedgerResponse>(`/plan/${runId}/${planId}/ledger`),
  ports: () => req<{ ports: Port[] }>("/ports", undefined, 6000),
  routes: () => req<{ routes: RouteGeometry[] }>("/routes", undefined, 6000),
  fleet: () => req<{ vessels: Vessel[] }>("/fleet"),
  registerVessel: (body: { name: string; vessel_class: string; fuel_type?: string }) =>
    req<Vessel>("/fleet", { method: "POST", body: JSON.stringify(body) }),
};
