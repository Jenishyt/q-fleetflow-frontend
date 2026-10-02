import type { LngLat } from "./lanes";

export type ZoneKind = "advisory" | "eca";
export interface Zone { id: string; name: string; kind: ZoneKind; note: string; ring: LngLat[] }

// INDICATIVE shapes only - hand-drawn rings, not official boundaries and not live threat data.
// Advisory zones reflect long-standing public shipping advisories (piracy / conflict-disruption
// areas); ECAs are the SOx Emission Control Areas. Replace with authoritative GeoJSON
// (IMO / UKMTO / ReCAAP / EMSA) before using for anything beyond a demo.
export const ZONES: Zone[] = [
  {
    id: "red-sea", name: "Red Sea / Bab-el-Mandeb", kind: "advisory",
    note: "Regional conflict-related disruption to commercial shipping since late 2023 - many carriers divert via the Cape. Check current advisories.",
    ring: [[32.5, 30.0], [34.0, 27.0], [36.5, 22.5], [38.5, 18.0], [40.5, 14.8], [42.5, 12.8], [43.6, 12.6], [43.2, 14.5], [41.5, 17.5], [39.2, 21.5], [36.5, 26.0], [35.0, 28.2], [34.0, 29.2]],
  },
  {
    id: "gulf-aden", name: "Gulf of Aden / Somali Basin", kind: "advisory",
    note: "Historic piracy high-risk area; Best Management Practices apply.",
    ring: [[43.0, 12.9], [45.0, 13.0], [48.5, 14.0], [52.5, 15.5], [56.0, 14.5], [58.0, 11.0], [55.0, 5.0], [51.0, 2.0], [47.0, 3.0], [45.5, 8.0], [43.5, 11.0]],
  },
  {
    id: "hormuz", name: "Strait of Hormuz", kind: "advisory",
    note: "Chokepoint with periodic geopolitical tension; roughly a fifth of seaborne oil passes through.",
    ring: [[55.5, 27.0], [57.2, 26.6], [57.0, 25.4], [56.0, 25.3], [55.0, 26.0]],
  },
  {
    id: "malacca", name: "Malacca & Singapore Straits", kind: "advisory",
    note: "Dense traffic; opportunistic theft/boarding incidents are reported by ReCAAP.",
    ring: [[95.2, 6.0], [97.5, 6.0], [100.8, 3.6], [103.2, 1.9], [104.8, 1.5], [104.8, 1.1], [103.0, 0.9], [100.2, 2.5], [97.0, 4.8], [95.2, 5.3]],
  },
  {
    id: "med-eca", name: "Mediterranean SOx ECA", kind: "eca",
    note: "Mediterranean SOx Emission Control Area (in force from 1 May 2025): max 0.10% sulphur fuel or scrubber.",
    ring: [[-5.4, 36.3], [-5.4, 35.8], [-2.0, 35.1], [10.0, 37.3], [11.0, 33.5], [20.0, 32.0], [32.0, 31.2], [36.0, 34.3], [36.2, 36.8], [30.0, 36.2], [26.3, 36.0], [26.2, 40.0], [19.5, 41.0], [13.0, 45.8], [8.0, 44.2], [3.0, 43.3], [-0.5, 38.5]],
  },
  {
    id: "nsea-eca", name: "North Sea / English Channel SECA", kind: "eca",
    note: "North Sea & Channel SOx ECA: max 0.10% sulphur fuel or scrubber.",
    ring: [[-5, 48.5], [-4, 50.5], [-1.5, 55], [-3, 58.5], [4, 62], [8, 62], [12, 57.5], [10.5, 54], [8.5, 53.8], [5, 53], [3, 51.3], [1.5, 50.8], [-1, 49.7]],
  },
];

export function pointInRing(p: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Normalise a possibly-unwrapped longitude back into [-180,180]. */
export function wrapLon(lon: number) {
  let x = ((lon + 180) % 360 + 360) % 360 - 180;
  if (x === -180 && lon > 0) x = 180;
  return x;
}

export function zonesCrossed(samples: LngLat[]): Zone[] {
  const hit = new Map<string, Zone>();
  for (const s of samples) {
    const p: LngLat = [wrapLon(s[0]), s[1]];
    for (const z of ZONES) if (!hit.has(z.id) && pointInRing(p, z.ring)) hit.set(z.id, z);
  }
  return ZONES.filter((z) => hit.has(z.id));
}
