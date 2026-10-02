import type { RouteOptions } from "../lib/sea/router";
import { findRoute } from "../lib/sea/router";
import { BASE_PORTS, EXTRA_PORTS } from "../lib/sea/ports";
const P = Object.fromEntries([...BASE_PORTS, ...EXTRA_PORTS].map((p) => [p.locode, p]));
// Sanity check only: the reference figures below are rough, from-memory values (NOT authoritative).
// Expect the lane graph to land within roughly +/-15% of real sea distances; replace with a licensed
// distance table (e.g. from a port-to-port tool) before quoting any figure externally.
const tests: [string, string, number, RouteOptions?][] = [
  ["INMAA","SGSIN",1500], ["INBOM","NLRTM",6300],
  ["SGSIN","NLRTM",8300], ["CNSHA","USLAX",5750], ["SGSIN","NLRTM",11700,{avoidSuez:true}],
  ["AEJEA","SGSIN",3350], ["BRSSZ","NLRTM",5500], ["JPTYO","USLAX",4700], ["INMAA","AEJEA",2500], ["CNSHA","SGSIN",2000], ["USNYC","NLRTM",3350],
];
for (const [a,b,ref,o] of tests) {
  const r = findRoute(P[a], P[b], o ?? {});
  if (!r) { console.log("NO ROUTE", a, b); continue; }
  const err = ((r.distanceNm - ref) / ref * 100).toFixed(1);
  console.log(`${a}-${b}${o?" (noSuez)":""}: ${r.distanceNm.toFixed(0)} nm vs rough ~${ref}  (${err}%)  choke=[${r.chokepoints.join(", ")}] zones=[${r.zones.map(z=>z.id).join(",")}]`);
}
