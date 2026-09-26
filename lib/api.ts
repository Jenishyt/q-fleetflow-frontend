const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ParetoPoint = {
  plan_id: string;
  J1_cost_usd: number;
  J2_ghg_intensity: number;
  J3_schedule_risk: number;
  fueleu_compliant: boolean;
};

export type OptimizeResponse = {
  run_id: string;
  n_pop: number;
  n_generations: number;
  elapsed_s: number;
  pareto_front: ParetoPoint[];
};

export type LedgerResponse = {
  plan_id: string;
  fuel_cost_usd: number;
  ets_cost_usd: number;
  demand_penalty_usd: number;
  fueleu_intensity: number;
  fueleu_limit: number;
  fueleu_compliant: boolean;
  total_co2_ttw_t: number;
  risk_hours: number;
  n_legs: number;
};

export type HealthResponse = {
  status: string;
  model_version: string;
  data_hash: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

export type Port = { name: string; country: string; locode: string; lat: number; lon: number };
export type Vessel = {
  id: string; name: string; vessel_class: string; capacity_dwt: number;
  design_speed_kn: number; engine_power_kw: number; max_draft_m: number;
  fuel_type: string; status: string;
};
export type RouteGeometry = {
  name: string; distance_nm: number; demand_dwt_per_week: number;
  fuel_availability: string[]; origin: Port | null; destination: Port | null;
};

export const api = {
  health: () => request<HealthResponse>("/health"),

  optimize: (params: { n_pop: number; n_generations: number; seed: number }) =>
    request<OptimizeResponse>("/optimize", {
      method: "POST",
      body: JSON.stringify({ scenario_path: "configs/scenario.yaml", ...params }),
    }),

  ledger: (runId: string, planId: string) =>
    request<LedgerResponse>(`/plan/${runId}/${planId}/ledger`),

  predict: (params: {
    vessel_class: string; speed_kn: number; draft_ratio: number;
    wind_kn?: number; wave_hs_m?: number; temp_c?: number; fuel_type?: string;
  }) =>
    request<{ fuel_t_per_day: number; q10: number; q90: number; shap_top3: [string, number][] }>("/predict", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  ports: () => request<{ ports: Port[] }>("/ports"),

  fleet: () => request<{ vessels: Vessel[] }>("/fleet"),

  registerVessel: (params: { name: string; vessel_class: string; fuel_type?: string }) =>
    request<Vessel>("/fleet", { method: "POST", body: JSON.stringify(params) }),

  routes: () => request<{ routes: RouteGeometry[] }>("/routes"),
};
