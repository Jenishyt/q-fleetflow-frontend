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
    request<{ fuel_t_per_day: number; q10: number; q90: number }>("/predict", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};
