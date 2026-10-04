import type { Port } from "../api";
import { BASE_PORTS, EXTRA_PORTS } from "../sea/ports";
import { findRoute, haversineNm, type SeaRoute } from "../sea/router";
import { CARGOS, PLACES, VEHICLES, type Cargo, type CargoId, type ModeId, type Place, type Vehicle } from "./data";

export interface Overrides { [vehicleId: string]: Partial<Pick<Vehicle, "costPerTkm" | "gPerTkm" | "speedKmh">> }
export interface Params {
  from: string; to: string; cargo: CargoId; tonnes: number; valuePerT: number; deadlineDays: number;
  carbonUsdPerT: number; storageDays: number; enabled: Record<string, boolean>; avoidSuez: boolean; overrides: Overrides;
}
export interface Op { kind: string; label: string; hours: number; costUsd: number; co2Kg: number; at: string }
export interface Leg {
  from: Place; to: Place; vehicle: Vehicle; distKm: number; hours: number; costUsd: number; co2Kg: number;
  trips: number; util: number; path: [number, number][]; seaRoute?: SeaRoute; role: "main" | "first" | "last";
}
export type Item = { type: "leg"; leg: Leg } | { type: "op"; op: Op };
export interface Totals {
  freightUsd: number; opsUsd: number; inventoryUsd: number; carbonUsd: number; totalUsd: number;
  hours: number; co2Kg: number; distKm: number; co2ByMode: Partial<Record<ModeId, number>>; hoursByMode: Partial<Record<ModeId, number>>;
}
export interface Option { id: string; items: Item[]; legs: Leg[]; totals: Totals; tags: string[]; signature: string }
export interface Result { options: Option[]; baseline: Option | null; deadlineMissed: boolean; expanded: number; ms: number; error?: string }

const KM_PER_NM = 1.852;
const PORT_BY_CODE = new Map<string, Port>([...BASE_PORTS, ...EXTRA_PORTS].map((p) => [p.locode, p]));
PORT_BY_CODE.set("INHLD", { name: "Haldia", country: "India", locode: "INHLD", lat: 22.03, lon: 88.07 });
const portOf = (p: Place): Port | null => (p.port ? PORT_BY_CODE.get(p.port) ?? null : null);
export const placeById = (id: string) => PLACES.find((p) => p.id === id);
const IDX = new Map(PLACES.map((p, i) => [p.id, i]));
const gcCache = new Map<number, number>();
export const gcKm = (a: Place, b: Place) => {
  const k = IDX.get(a.id)! * 64 + IDX.get(b.id)!;
  let v = gcCache.get(k);
  if (v === undefined) { v = haversineNm([a.lon, a.lat], [b.lon, b.lat]) * KM_PER_NM; gcCache.set(k, v); }
  return v;
};

const seaCache = new Map<number, SeaRoute | null>();
function seaRoute(a: Place, b: Place, avoidSuez: boolean): SeaRoute | null {
  const key = (IDX.get(a.id)! * 64 + IDX.get(b.id)!) * 2 + (avoidSuez ? 1 : 0);
  if (!seaCache.has(key)) {
    const pa = portOf(a), pb = portOf(b);
    seaCache.set(key, pa && pb ? findRoute(pa, pb, { avoidSuez }) : null);
  }
  return seaCache.get(key)!;
}

/** Fill a leg's drawing path (done only for legs that survive into a final itinerary). */
function fillPath(l: Leg) {
  if (l.path.length) return;
  if (l.seaRoute) l.path = l.seaRoute.path;
  else l.path = curve(l.from, l.to, l.vehicle.mode === "air" ? 0.18 : l.vehicle.mode === "rail" ? 0.05 : l.vehicle.mode === "barge" ? 0.07 : l.role === "main" ? 0.03 : 0.02);
}

/** Curved line between two places for drawing (air arcs bow more than ground legs). */
function curve(a: Place, b: Place, bow: number): [number, number][] {
  const n = 24, dx = b.lon - a.lon, dy = b.lat - a.lat, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, h = len * bow;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, k = 4 * t * (1 - t) * h;
    return [a.lon + dx * t + nx * k, a.lat + dy * t + ny * k] as [number, number];
  });
}

interface Ctx { cargo: Cargo; tonnes: number; avoidSuez: boolean; veh: Vehicle[] }

function eff(v: Vehicle, o: Overrides): Vehicle { return o[v.id] ? { ...v, ...o[v.id] } : v; }

/** One movement of the cargo by one vehicle type. Returns null when the leg is physically or commercially impossible. */
function makeLeg(a: Place, b: Place, v: Vehicle, ctx: Ctx, role: Leg["role"], forcedKm?: number): Leg | null {
  const { cargo, tonnes } = ctx;
  if (v.maxTonnes !== undefined && tonnes > v.maxTonnes) return null;
  let distKm = forcedKm ?? 0;
  const path: [number, number][] = [];
  let seaR: SeaRoute | undefined;
  if (forcedKm === undefined) {
    if (v.mode === "road" || v.mode === "rail" || v.mode === "barge") {
      if (a.group !== b.group) return null;
      if (v.mode === "rail" && !(a.rail && b.rail)) return null;
      if (v.mode === "barge" && !(a.waterway && a.waterway === b.waterway)) return null;
    } else if (v.mode === "sea") {
      const r = seaRoute(a, b, ctx.avoidSuez);
      if (!r) return null;
      seaR = r; distKm = r.distanceNm * KM_PER_NM;
    } else if (v.mode === "air") {
      if (!(a.air && b.air)) return null;
    }
    if (v.mode !== "sea") distKm = gcKm(a, b) * v.circuity;
  }
  if ((v.minKm && distKm < v.minKm) || (v.maxKm && distKm > v.maxKm)) return null;

  const unitised = v.payloadT < 100;
  const trips = unitised ? Math.max(1, Math.ceil(tonnes / v.payloadT)) : 1;
  const util = unitised ? tonnes / (trips * v.payloadT) : 0.8;
  const mult = cargo.costMult * (cargo.reefer ? 1.35 : 1) * (cargo.oversize && v.mode === "road" ? 2.2 : 1) * (cargo.hazmat ? 1.25 : 1);
  let costUsd: number, co2Kg: number;
  if (unitised) {
    const billable = Math.max(tonnes / trips, 0.35 * v.payloadT);               // part-loads are billed at least 35% of payload
    costUsd = trips * (v.fixedUsd + distKm * v.costPerTkm * billable * mult);
    co2Kg = (trips * distKm * v.gPerTkm * 0.7 * v.payloadT * (0.4 + 0.6 * (util / 0.7)) * (cargo.reefer ? 1.25 : 1)) / 1000; // 40% of vehicle energy is load-independent
  } else {
    costUsd = v.fixedUsd + tonnes * distKm * v.costPerTkm * mult;
    co2Kg = (tonnes * distKm * v.gPerTkm * (cargo.reefer ? 1.25 : 1)) / 1000;
  }
  const speed = v.speedKmh * (cargo.oversize && v.mode === "road" ? 0.6 : 1);
  const hours = distKm / speed + (role === "main" ? 0 : 1.5);                    // first/last-mile adds gate + queue time
  return { from: a, to: b, vehicle: v, distKm, hours, costUsd, co2Kg, trips, util, path, seaRoute: seaR, role };
}

/** Terminal-handling class when cargo changes mode. */
function handlingFor(prev: Vehicle, next: Vehicle, ctx: Ctx, at: string): Op {
  const m = [prev.mode, next.mode];
  const cls = m.includes("air") ? { h: 8, perT: 40, fixed: 200, kg: 2.0, label: "Air cargo terminal handling & security" }
    : m.includes("sea") ? { h: 18, perT: 18, fixed: 250, kg: 3.0, label: "Port handling, gate & dwell" }
    : m.includes("barge") ? { h: 8, perT: 9, fixed: 150, kg: 1.5, label: "Waterway terminal transshipment" }
    : prev.mode === next.mode && next.mode === "road" ? { h: 10, perT: 5, fixed: 60, kg: 1.0, label: "Cross-dock / consolidation" }
    : prev.mode === next.mode ? { h: 6, perT: 3, fixed: 60, kg: 0.8, label: "Terminal marshalling" }
    : { h: 6, perT: 6, fixed: 120, kg: 1.5, label: "Rail terminal transshipment" };
  const hm = ctx.cargo.handlingMult;
  return { kind: "handling", label: cls.label + (ctx.cargo.reefer ? " (cold chain)" : ctx.cargo.hazmat ? " (dangerous goods)" : ""), hours: cls.h * (ctx.cargo.hazmat ? 1.3 : 1), costUsd: (cls.fixed + cls.perT * ctx.tonnes) * hm, co2Kg: cls.kg * ctx.tonnes, at };
}
const customs = (a: Place, b: Place, v: Vehicle, ctx: Ctx): Op | null =>
  a.country === b.country ? null : {
    kind: "customs", label: `Customs clearance (${b.country})`, at: b.name,
    hours: (v.mode === "sea" || v.mode === "air" ? 10 : 20) * ctx.cargo.customsHoursMult,
    costUsd: (120 + 1.5 * ctx.tonnes) * (ctx.cargo.hazmat ? 1.3 : 1), co2Kg: 0,
  };
const waitOp = (v: Vehicle, at: string): Op | null => (v.waitH > 0 ? { kind: "wait", label: `Wait for ${v.label.toLowerCase()} departure`, hours: v.waitH, costUsd: 0, co2Kg: 0, at } : null);

interface Label { place: Place; veh: Vehicle | null; cost: number; hours: number; co2: number; dist: number; g: number; parent: Label | null; legs: Leg[]; ops: Op[] }

function summarize(items: Item[], p: Params, cargo: Cargo): Totals {
  const t: Totals = { freightUsd: 0, opsUsd: 0, inventoryUsd: 0, carbonUsd: 0, totalUsd: 0, hours: 0, co2Kg: 0, distKm: 0, co2ByMode: {}, hoursByMode: {} };
  for (const it of items) {
    if (it.type === "leg") {
      const l = it.leg, m = l.vehicle.mode;
      t.freightUsd += l.costUsd; t.hours += l.hours; t.co2Kg += l.co2Kg; t.distKm += l.distKm;
      t.co2ByMode[m] = (t.co2ByMode[m] ?? 0) + l.co2Kg; t.hoursByMode[m] = (t.hoursByMode[m] ?? 0) + l.hours;
    } else { t.opsUsd += it.op.costUsd; t.hours += it.op.hours; t.co2Kg += it.op.co2Kg; }
  }
  void cargo;
  t.inventoryUsd = p.valuePerT * p.tonnes * 0.18 * (t.hours / 24 / 365);       // 18% annual carrying cost (assumption)
  t.carbonUsd = (t.co2Kg / 1000) * p.carbonUsdPerT;
  t.totalUsd = t.freightUsd + t.opsUsd + t.inventoryUsd + t.carbonUsd;
  return t;
}

const dominates = (a: Label, b: Label, e: number) => a.g <= b.g * (1 + e) && a.hours <= b.hours * (1 + e) && a.co2 <= b.co2 * (1 + e);

export function plan(p: Params): Result {
  const t0 = performance.now();
  const A = placeById(p.from), B = placeById(p.to), cargo = CARGOS.find((c) => c.id === p.cargo)!;
  const empty = (error: string): Result => ({ options: [], baseline: null, deadlineMissed: false, expanded: 0, ms: performance.now() - t0, error });
  if (!A || !B) return empty("Pick an origin and a destination.");
  if (A.id === B.id) return empty("Origin and destination are the same place.");

  const veh = VEHICLES.filter((v) => p.enabled[v.id] !== false && cargo.allow(v)).map((v) => eff(v, p.overrides));
  const ctx: Ctx = { cargo, tonnes: p.tonnes, avoidSuez: p.avoidSuez, veh };
  const mainVeh = veh.filter((v) => !v.drayageOnly);
  const dray = veh.filter((v) => v.mode === "road" || v.mode === "urban");
  const direct = gcKm(A, B);
  const invPerH = p.valuePerT * p.tonnes * 0.18 / 365 / 24;
  const gOf = (cost: number, hours: number, co2: number) => cost + hours * invPerH + (co2 / 1000) * p.carbonUsdPerT;
  let expanded = 0;

  const edgeCache = new Map<number, Leg[]>();
  const edgesFrom = (a: Place, vi: number): Leg[] => {
    const key = IDX.get(a.id)! * 32 + vi;
    let e = edgeCache.get(key);
    if (!e) {
      e = [];
      for (const q of PLACES) if (q.id !== a.id) { const l = makeLeg(a, q, mainVeh[vi], ctx, "main"); if (l) e.push(l); }
      edgeCache.set(key, e);
    }
    return e;
  };
  const MODES: ModeId[] = ["road", "rail", "barge", "sea", "air", "urban"];
  const mi = (m: ModeId) => MODES.indexOf(m);
  const memo = new Map<number, unknown>();
  const cached = <T,>(k: number, f: () => T): T => { let v = memo.get(k); if (v === undefined) { v = f() ?? null; memo.set(k, v); } return v as T; };
  const NP = PLACES.length;

  const search = (deadlineH: number): Label[] => {
    const start: Label = { place: A, veh: null, cost: 0, hours: 0, co2: 0, dist: 0, g: 0, parent: null, legs: [], ops: [] };
    const fronts = new Map<number, Label[]>();
    let frontier: Label[] = [start];
    for (let depth = 1; depth <= 5; depth++) {
      const next: Label[] = [];
      for (const lab of frontier) {
        const visited: string[] = [];
        for (let l: Label | null = lab; l; l = l.parent) visited.push(l.place.id);
        const pi = IDX.get(lab.place.id)!;
        for (let vi = 0; vi < mainVeh.length; vi++) {
          const v = mainVeh[vi];
          for (const leg of edgesFrom(lab.place, vi)) {
            const q = leg.to;
            if (visited.includes(q.id)) continue;
            expanded++;
            const qi = IDX.get(q.id)!;
            const dist = lab.dist + leg.distKm;
            if (dist > 3 * direct + 800) continue;
            const ops: Op[] = [];
            if (lab.veh) ops.push(cached(1_000_000 + (mi(lab.veh.mode) * 8 + mi(v.mode)) * NP + pi, () => handlingFor(lab.veh!, v, ctx, lab.place.name)));
            const w = cached(2_000_000 + vi * NP + pi, () => waitOp(v, lab.place.name)); if (w) ops.push(w);
            const c = cached(3_000_000 + (pi * NP + qi) * 8 + mi(v.mode), () => customs(lab.place, q, v, ctx)); if (c) ops.push(c);
            let cost = lab.cost + leg.costUsd, hours = lab.hours + leg.hours, co2 = lab.co2 + leg.co2Kg;
            for (const o of ops) { cost += o.costUsd; hours += o.hours; co2 += o.co2Kg; }
            if (hours > deadlineH) continue;
            const nl: Label = { place: q, veh: v, cost, hours, co2, dist, g: gOf(cost, hours, co2), parent: lab, legs: [leg], ops };
            const key = qi * 8 + mi(v.mode);
            const isDest = q.id === B.id;
            const set = fronts.get(key) ?? [];
            if (set.some((x) => dominates(x, nl, 0.005))) continue;
            const keep = set.filter((x) => !dominates(nl, x, 0));
            keep.push(nl);
            while (keep.length > 8) {
              const gm = Math.min(...keep.map((x) => x.g)), hm = Math.min(...keep.map((x) => x.hours)), cm = Math.min(...keep.map((x) => x.co2)) || 1;
              const protect = new Set([keep.findIndex((x) => x.g === gm), keep.findIndex((x) => x.hours === hm), keep.findIndex((x) => x.co2 === cm)]);   // never evict an extreme
              let worst = -1, ws = -1;
              keep.forEach((x, i) => { if (protect.has(i)) return; const s = x.g / gm + x.hours / hm + x.co2 / cm; if (s > ws) { ws = s; worst = i; } });
              if (worst < 0) break;
              keep.splice(worst, 1);
            }
            fronts.set(key, keep);
            if (!isDest && keep.includes(nl)) next.push(nl);
          }
        }
      }
      frontier = next;
      if (!frontier.length) break;
    }
    const bi = IDX.get(B.id)!;
    return MODES.flatMap((_, m) => fronts.get(bi * 8 + m) ?? []);
  };

  const baseDeadline = p.deadlineDays * 24;
  let finals = search(baseDeadline);
  let deadlineMissed = false;
  if (!finals.length) { finals = search(1e9); deadlineMissed = finals.length > 0; }
  if (!finals.length) return { ...empty("No route exists with the selected modes and cargo type. Enable more modes or change the cargo."), expanded };

  // build full itineraries (+ first/last-mile variants), then keep the Pareto set
  const build = (f: Label, fm: Vehicle | null, lm: Vehicle | null): Option | null => {
    const legs: Leg[] = []; const seq: Label[] = [];
    for (let l: Label | null = f; l && l.parent; l = l.parent) seq.unshift(l);
    const items: Item[] = [];
    const load = (at: string, what: string): Op => ({ kind: "loading", label: what, hours: 2, costUsd: 20 + 4 * p.tonnes, co2Kg: 0.3 * p.tonnes, at });
    items.push({ type: "op", op: load(A.name, "Loading at shipper") });
    const firstMain = seq[0].legs[0], lastMain = seq[seq.length - 1].legs[0];
    if (firstMain.vehicle.mode !== "road") {
      if (!fm) return null;
      const fl = makeLeg(A, A, fm, ctx, "first", A.hubKm); if (!fl) return null;
      fl.from = A; fl.to = A; legs.push(fl); items.push({ type: "leg", leg: fl });
    }
    for (const s of seq) {
      for (const o of s.ops) items.push({ type: "op", op: o });
      legs.push(s.legs[0]); items.push({ type: "leg", leg: s.legs[0] });
    }
    if (lastMain.vehicle.mode !== "road") {
      if (!lm) return null;
      const ll = makeLeg(B, B, lm, ctx, "last", B.hubKm); if (!ll) return null;
      legs.push(ll); items.push({ type: "leg", leg: ll });
    }
    if (p.storageDays > 0) items.push({ type: "op", op: { kind: "storage", label: `Warehousing / buffer storage (${p.storageDays} d)`, hours: p.storageDays * 24, costUsd: p.storageDays * p.tonnes * 1.2, co2Kg: 0.05 * p.tonnes * p.storageDays, at: B.name } });
    items.push({ type: "op", op: load(B.name, "Unloading at consignee") });
    legs.forEach(fillPath);
    const totals = summarize(items, p, cargo);
    const signature = [...items.filter((i): i is Extract<Item, { type: "leg" }> => i.type === "leg")].map((i) => `${i.leg.vehicle.id}:${i.leg.from.id}>${i.leg.to.id}`).join("|");
    return { id: signature, items, legs, totals, tags: [], signature };
  };

  const needFirst = finals.some((f) => { let l: Label = f; while (l.parent && l.parent.parent) l = l.parent; return l.legs[0].vehicle.mode !== "road"; });
  void needFirst;
  let cands: Option[] = [];
  const seen = new Set<string>();
  for (const f of finals) {
    const seq: Label[] = []; for (let l: Label | null = f; l && l.parent; l = l.parent) seq.unshift(l);
    const needF = seq[0].legs[0].vehicle.mode !== "road", needL = seq[seq.length - 1].legs[0].vehicle.mode !== "road";
    for (const fm of needF ? dray : [null]) for (const lm of needL ? dray : [null]) {
      const o = build(f, fm, lm);
      if (!o) continue;
      const sig = o.signature + "#" + (fm?.id ?? "") + "#" + (lm?.id ?? "");
      if (seen.has(sig)) continue; seen.add(sig); o.id = sig; cands.push(o);
    }
  }
  if (!cands.length) return { ...empty("No feasible first/last-mile vehicle for this cargo."), expanded };

  // all-road door-to-door baseline, when the geography allows it (same ops model: loading, customs)
  let baseline: Option | null = null;
  const truck = veh.find((v) => v.id === "truck_diesel") ?? veh.find((v) => v.mode === "road");
  if (truck && A.group === B.group) {
    const leg = makeLeg(A, B, truck, ctx, "main");
    if (leg) {
      fillPath(leg);
      const items: Item[] = [{ type: "op", op: { kind: "loading", label: "Loading at shipper", hours: 2, costUsd: 20 + 4 * p.tonnes, co2Kg: 0.3 * p.tonnes, at: A.name } }, { type: "leg", leg }];
      const cu = customs(A, B, truck, ctx); if (cu) items.push({ type: "op", op: cu });
      items.push({ type: "op", op: { kind: "loading", label: "Unloading at consignee", hours: 2, costUsd: 20 + 4 * p.tonnes, co2Kg: 0.3 * p.tonnes, at: B.name } });
      baseline = { id: "baseline", items, legs: [leg], totals: summarize(items, p, cargo), tags: [], signature: `${truck.id}:${A.id}>${B.id}` };
      if (!cands.some((c) => c.signature === baseline!.signature)) cands.push({ ...baseline, id: baseline.signature + "#", tags: [] });
    }
  }

  // keep up to 3 variants (cheapest / greenest / fastest) of each main chain, then take the global Pareto set
  const chainOf = (o: Option) => o.legs.filter((l) => l.role === "main").map((l) => `${l.vehicle.id}:${l.from.id}>${l.to.id}`).join("|");
  const groups = new Map<string, Option[]>();
  cands.forEach((o) => groups.set(chainOf(o), [...(groups.get(chainOf(o)) ?? []), o]));
  cands = [...groups.values()].flatMap((g) => {
    const m = (f: (o: Option) => number) => g.reduce((x, y) => (f(y) < f(x) ? y : x));
    return [...new Set([m((o) => o.totals.totalUsd), m((o) => o.totals.co2Kg), m((o) => o.totals.hours)])];
  });
  cands = cands.filter((a) => !cands.some((b) => b !== a && b.totals.totalUsd <= a.totals.totalUsd && b.totals.hours <= a.totals.hours && b.totals.co2Kg <= a.totals.co2Kg && (b.totals.totalUsd < a.totals.totalUsd || b.totals.hours < a.totals.hours || b.totals.co2Kg < a.totals.co2Kg)));
  cands.sort((a, b) => a.totals.totalUsd - b.totals.totalUsd);
  const pick = (f: (o: Option) => number) => cands.reduce((m, o) => (f(o) < f(m) ? o : m));
  const cheapest = pick((o) => o.totals.totalUsd), fastest = pick((o) => o.totals.hours), greenest = pick((o) => o.totals.co2Kg);
  const mn = (k: "totalUsd" | "hours" | "co2Kg") => Math.min(...cands.map((o) => o.totals[k])), mx = (k: "totalUsd" | "hours" | "co2Kg") => Math.max(...cands.map((o) => o.totals[k]));
  const norm = (o: Option, k: "totalUsd" | "hours" | "co2Kg") => (mx(k) === mn(k) ? 0 : (o.totals[k] - mn(k)) / (mx(k) - mn(k)));
  const balanced = pick((o) => norm(o, "totalUsd") + norm(o, "hours") + norm(o, "co2Kg"));
  cheapest.tags.push("Cheapest"); fastest.tags.push("Fastest"); greenest.tags.push("Greenest"); balanced.tags.push("Balanced");
  const keep = new Set([cheapest, fastest, greenest, balanced]);
  const rest = cands.filter((o) => !keep.has(o)).slice(0, Math.max(0, 16 - keep.size));
  const options = [...keep, ...rest].sort((a, b) => a.totals.totalUsd - b.totals.totalUsd);
  return { options, baseline, deadlineMissed, expanded, ms: performance.now() - t0 };
}
export const DEFAULT_PARAMS: Params = {
  from: "delhi", to: "rotterdam", cargo: "general", tonnes: 40, valuePerT: 3000, deadlineDays: 45, carbonUsdPerT: 0, storageDays: 0, enabled: {}, avoidSuez: false, overrides: {},
};
