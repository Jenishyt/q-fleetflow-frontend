import type { Port } from "@/lib/api";
import { EU_COUNTRIES } from "./ports";
import type { SeaRoute } from "./router";

export const FUELS = ["VLSFO", "MDO", "LNG", "MeOH"] as const;
export type Fuel = (typeof FUELS)[number];
export const VESSEL_CLASSES = ["container", "bulk_carrier", "tanker", "general_cargo"] as const;
export type VesselClass = (typeof VESSEL_CLASSES)[number];

// Tank-to-wake CO2 per tonne of fuel (IMO MEPC.308(73) default Cf values).
export const CF_TTW: Record<Fuel, number> = { VLSFO: 3.151, MDO: 3.206, LNG: 2.75, MeOH: 1.375 };
// Scenario defaults copied from backend configs/scenario.yaml (editable assumptions, not market data).
export const FUEL_PRICE_USD_T: Record<Fuel, number> = { VLSFO: 600, MDO: 650, LNG: 550, MeOH: 700 };
export const EUA_USD_T = 80;
export const ETS_SHARE_2026 = 1.0;

// Fallback physics prior used ONLY when the backend is unreachable (same admiralty form as src/models/physics.py).
const DWT: Record<VesselClass, number> = { container: 40000, bulk_carrier: 55000, tanker: 60000, general_cargo: 15000 };
const C_CLASS: Record<VesselClass, number> = { container: 1.9, bulk_carrier: 1.6, tanker: 1.7, general_cargo: 2.2 };
export const DESIGN_SPEED: Record<VesselClass, number> = { container: 22, bulk_carrier: 14.5, tanker: 15, general_cargo: 16 };
export function physicsFuelTPerDay(vc: VesselClass, speedKn: number, draft = 0.75) {
  return (C_CLASS[vc] * Math.pow(draft * DWT[vc], 2 / 3) * Math.pow(speedKn, 3)) / 1e6;
}

export function etsCoverage(a: Port, b: Port): number {
  const ea = EU_COUNTRIES.has(a.country), eb = EU_COUNTRIES.has(b.country);
  return ea && eb ? 1 : ea || eb ? 0.5 : 0;
}

export interface VoyageParams { vesselClass: VesselClass; fuel: Fuel; speedKn: number; fuelTPerDay: number; source: "backend" | "physics-fallback" }
export interface VoyageEstimate {
  days: number; fuelT: number; co2T: number; fuelCostUsd: number; etsCostUsd: number; totalUsd: number; etsCoverage: number;
}

export function estimateVoyage(route: SeaRoute, p: VoyageParams): VoyageEstimate {
  const days = route.distanceNm / (p.speedKn * 24);
  const fuelT = p.fuelTPerDay * days;
  const co2T = fuelT * CF_TTW[p.fuel];
  const cov = etsCoverage(route.from, route.to);
  const fuelCostUsd = fuelT * FUEL_PRICE_USD_T[p.fuel];
  const etsCostUsd = co2T * cov * ETS_SHARE_2026 * EUA_USD_T;
  return { days, fuelT, co2T, fuelCostUsd, etsCostUsd, totalUsd: fuelCostUsd + etsCostUsd, etsCoverage: cov };
}
