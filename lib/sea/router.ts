import type { Port } from "@/lib/api";
import { LANE_EDGES, LANE_NODES, PORT_APPROACH, type LngLat } from "./lanes";
import { zonesCrossed, type Zone } from "./zones";

const R_NM = 3440.065;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance between two [lon,lat] points, nautical miles. */
export function haversineNm(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const CHOKEPOINTS: Record<string, string> = {
  SUEZ_S: "Suez Canal", BAM: "Bab-el-Mandeb", HOR_1: "Strait of Hormuz", MAL_3: "Strait of Malacca",
  SIN_A: "Singapore Strait", GIB: "Strait of Gibraltar", TWS_1: "Taiwan Strait", CHN_3: "Dover Strait",
  AGU: "Cape of Good Hope", CPE: "Cape of Good Hope", PIR_1: "Cretan Passage",
};

type Adj = Map<string, { to: string; w: number; canal: boolean }[]>;
const ADJ: Adj = (() => {
  const m: Adj = new Map();
  for (const id of Object.keys(LANE_NODES)) m.set(id, []);
  for (const [a, b, kind] of LANE_EDGES) {
    const w = haversineNm(LANE_NODES[a], LANE_NODES[b]);
    const canal = kind === "canal";
    m.get(a)!.push({ to: b, w, canal });
    m.get(b)!.push({ to: a, w, canal });
  }
  return m;
})();

export interface RouteOptions { avoidSuez?: boolean; avoidRedSea?: boolean }
export interface SeaRoute {
  from: Port; to: Port;
  /** polyline [lon,lat], longitudes unwrapped so the Pacific crossing is continuous */
  path: LngLat[];
  nodeIds: string[];
  distanceNm: number;
  approachNm: number; // harbour legs (port <-> lane network), drawn dotted
  chokepoints: string[];
  zones: Zone[];
  viaSuez: boolean;
  approximateApproach: boolean;
  options: RouteOptions;
}

const RED_SEA_NODES = new Set(["RS_1", "RS_2", "RS_3", "RS_4", "RS_5", "GS_1", "GS_2", "GS_3", "SUEZ_S", "SUEZ_N", "BAM", "JED_A"]);

function nearestNode(p: LngLat): string {
  let best = "", bd = Infinity;
  for (const [id, c] of Object.entries(LANE_NODES)) {
    const d = haversineNm(p, c);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

function dijkstra(src: string, dst: string, opt: RouteOptions): { ids: string[]; dist: number } | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const done = new Set<string>();
  for (const id of ADJ.keys()) dist.set(id, Infinity);
  dist.set(src, 0);
  while (true) {
    let u = "", ud = Infinity;
    for (const [id, d] of dist) if (!done.has(id) && d < ud) { ud = d; u = id; }
    if (!u || u === dst) break;
    done.add(u);
    for (const e of ADJ.get(u)!) {
      if (opt.avoidSuez && e.canal) continue;
      if (opt.avoidRedSea && (RED_SEA_NODES.has(u) || RED_SEA_NODES.has(e.to)) && u !== src && e.to !== dst) continue;
      const nd = ud + e.w;
      if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, u); }
    }
  }
  if (!isFinite(dist.get(dst) ?? Infinity)) return null;
  const ids: string[] = [];
  for (let c: string | undefined = dst; c; c = prev.get(c)) ids.unshift(c);
  return { ids, dist: dist.get(dst)! };
}

function unwrap(path: LngLat[]): LngLat[] {
  const out: LngLat[] = [];
  let offset = 0;
  path.forEach((p, i) => {
    if (i > 0) {
      const d = p[0] + offset - out[i - 1][0];
      if (d > 180) offset -= 360;
      else if (d < -180) offset += 360;
    }
    out.push([p[0] + offset, p[1]]);
  });
  return out;
}

function sample(path: LngLat[], stepNm = 60): LngLat[] {
  const s: LngLat[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const d = haversineNm(path[i - 1], path[i]);
    const n = Math.max(1, Math.ceil(d / stepNm));
    for (let k = 1; k <= n; k++) {
      s.push([path[i - 1][0] + ((path[i][0] - path[i - 1][0]) * k) / n, path[i - 1][1] + ((path[i][1] - path[i - 1][1]) * k) / n]);
    }
  }
  return s;
}

export function findRoute(from: Port, to: Port, options: RouteOptions = {}): SeaRoute | null {
  if (from.locode === to.locode) return null;
  const pFrom: LngLat = [from.lon, from.lat];
  const pTo: LngLat = [to.lon, to.lat];
  const aFrom = PORT_APPROACH[from.locode];
  const aTo = PORT_APPROACH[to.locode];
  const srcId = aFrom ?? nearestNode(pFrom);
  const dstId = aTo ?? nearestNode(pTo);
  const res = srcId === dstId ? { ids: [srcId], dist: 0 } : dijkstra(srcId, dstId, options);
  if (!res) return null;

  const lane = res.ids.map((id) => LANE_NODES[id]);
  const approachNm = haversineNm(pFrom, lane[0]) + haversineNm(lane[lane.length - 1], pTo);
  const path = unwrap([pFrom, ...lane, pTo]);
  const chokepoints: string[] = [];
  for (const id of res.ids) {
    const c = CHOKEPOINTS[id];
    if (c && !chokepoints.includes(c)) chokepoints.push(c);
  }
  return {
    from, to, path, nodeIds: res.ids,
    distanceNm: res.dist + approachNm, approachNm,
    chokepoints, zones: zonesCrossed(sample(path)),
    viaSuez: res.ids.includes("SUEZ_S"),
    approximateApproach: !aFrom || !aTo,
    options,
  };
}

/** Point at fraction t (0..1) of the way along a polyline (by great-circle length). */
export function pointAlong(path: LngLat[], t: number): { pos: LngLat; bearing: number } {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) { const d = haversineNm(path[i - 1], path[i]); seg.push(d); total += d; }
  let target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const f = seg[i] === 0 ? 0 : Math.min(1, target / seg[i]);
      const a = path[i], b = path[i + 1];
      // screen bearing in Web-Mercator: vertical distance is stretched by 1/cos(lat)
      const midLat = rad((a[1] + b[1]) / 2);
      const bearing = (Math.atan2(b[0] - a[0], (b[1] - a[1]) / Math.max(0.05, Math.cos(midLat))) * 180) / Math.PI;
      return { pos: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], bearing };
    }
    target -= seg[i];
  }
  return { pos: path[path.length - 1], bearing: 0 };
}
