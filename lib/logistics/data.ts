// Multi-modal logistics: places, vehicles, cargo types and operations.
// IMPORTANT: every number here is an INDICATIVE ASSUMPTION in the range of published default
// intensities (e.g. GLEC-style well-to-wheel factors) and typical freight tariffs. It is NOT
// measured or quoted data. All vehicle factors are editable in the UI (Assumptions tab).

export type ModeId = "road" | "rail" | "barge" | "sea" | "air" | "urban";
export const MODE_STYLE: Record<ModeId, { label: string; color: string; icon: string }> = {
  road: { label: "Road", color: "#d2a35c", icon: "🚚" },
  rail: { label: "Rail", color: "#7fb8ff", icon: "🚆" },
  barge: { label: "Inland waterway", color: "#6fd08c", icon: "🛶" },
  sea: { label: "Sea", color: "#4fb3d9", icon: "🚢" },
  air: { label: "Air", color: "#c58bd0", icon: "✈️" },
  urban: { label: "Urban last-mile", color: "#f08a6b", icon: "🛵" },
};

export interface Vehicle {
  id: string; mode: ModeId; label: string; note: string;
  payloadT: number;          // < 100 => counted in vehicles/trips; otherwise treated as consolidated capacity
  speedKmh: number;          // average door-to-door speed incl. rests, not top speed
  costPerTkm: number;        // USD per tonne-km
  fixedUsd: number;          // per vehicle-trip (unitised) or per leg (consolidated)
  gPerTkm: number;           // well-to-wheel gCO2e per tonne-km at ~70% load
  circuity: number;          // route distance / great-circle distance
  minKm?: number; maxKm?: number; waitH: number;   // waitH = expected wait for the next departure
  reeferOk: boolean; hazmatOk: boolean; oversizeOk: boolean; bulkOk: boolean;
  drayageOnly?: boolean;     // only used for first/last-mile, never as a main leg
  maxTonnes?: number;        // e.g. cargo bike
}

export const VEHICLES: Vehicle[] = [
  { id: "truck_diesel", mode: "road", label: "Diesel truck (20 t)", note: "Heavy goods vehicle, diesel", payloadT: 20, speedKmh: 45, costPerTkm: 0.040, fixedUsd: 40, gPerTkm: 75, circuity: 1.25, waitH: 0, reeferOk: true, hazmatOk: true, oversizeOk: true, bulkOk: true },
  { id: "truck_lng", mode: "road", label: "LNG truck (20 t)", note: "Includes methane slip in the well-to-wheel factor", payloadT: 20, speedKmh: 45, costPerTkm: 0.043, fixedUsd: 40, gPerTkm: 68, circuity: 1.25, waitH: 0, reeferOk: true, hazmatOk: true, oversizeOk: true, bulkOk: true },
  { id: "truck_ev", mode: "road", label: "Electric truck (18 t)", note: "Grid-mix dependent; range-limited per leg", payloadT: 18, speedKmh: 40, costPerTkm: 0.052, fixedUsd: 40, gPerTkm: 45, circuity: 1.25, maxKm: 300, waitH: 0, reeferOk: true, hazmatOk: true, oversizeOk: false, bulkOk: true },
  { id: "truck_h2", mode: "road", label: "Hydrogen fuel-cell truck (18 t)", note: "Assumes a low-carbon hydrogen supply mix", payloadT: 18, speedKmh: 45, costPerTkm: 0.085, fixedUsd: 40, gPerTkm: 40, circuity: 1.25, maxKm: 600, waitH: 0, reeferOk: true, hazmatOk: true, oversizeOk: false, bulkOk: true },
  { id: "rail_diesel", mode: "rail", label: "Diesel freight train", note: "Wagon-load / container train", payloadT: 1000, speedKmh: 35, costPerTkm: 0.022, fixedUsd: 150, gPerTkm: 28, circuity: 1.18, minKm: 300, maxKm: 4500, waitH: 12, reeferOk: true, hazmatOk: true, oversizeOk: true, bulkOk: true },
  { id: "rail_electric", mode: "rail", label: "Electric freight train", note: "Grid-mix dependent", payloadT: 1000, speedKmh: 40, costPerTkm: 0.020, fixedUsd: 150, gPerTkm: 22, circuity: 1.18, minKm: 300, maxKm: 4500, waitH: 12, reeferOk: true, hazmatOk: true, oversizeOk: true, bulkOk: true },
  { id: "barge", mode: "barge", label: "Inland waterway barge", note: "Only between places on the same river system", payloadT: 1500, speedKmh: 10, costPerTkm: 0.014, fixedUsd: 200, gPerTkm: 30, circuity: 1.4, waitH: 24, reeferOk: false, hazmatOk: true, oversizeOk: true, bulkOk: true },
  { id: "sea_coastal", mode: "sea", label: "Coastal / feeder ship", note: "Short-sea container feeder", payloadT: 5000, speedKmh: 26, costPerTkm: 0.015, fixedUsd: 300, gPerTkm: 24, circuity: 1, maxKm: 3500, waitH: 30, reeferOk: true, hazmatOk: true, oversizeOk: true, bulkOk: true },
  { id: "sea_deep", mode: "sea", label: "Deep-sea container ship", note: "Mainline container ship", payloadT: 100000, speedKmh: 33, costPerTkm: 0.0095, fixedUsd: 400, gPerTkm: 14, circuity: 1, minKm: 500, waitH: 48, reeferOk: true, hazmatOk: true, oversizeOk: true, bulkOk: true },
  { id: "sea_green", mode: "sea", label: "Low-carbon-fuel container ship", note: "Methanol/ammonia dual-fuel on a green-fuel supply (assumption)", payloadT: 100000, speedKmh: 33, costPerTkm: 0.0125, fixedUsd: 400, gPerTkm: 7, circuity: 1, minKm: 500, waitH: 60, reeferOk: true, hazmatOk: true, oversizeOk: true, bulkOk: true },
  { id: "air", mode: "air", label: "Air freight", note: "Belly + freighter average", payloadT: 100, speedKmh: 750, costPerTkm: 0.60, fixedUsd: 300, gPerTkm: 650, circuity: 1.05, minKm: 400, waitH: 8, reeferOk: true, hazmatOk: false, oversizeOk: false, bulkOk: false },
  { id: "van_diesel", mode: "urban", label: "Diesel delivery van", note: "First/last-mile, up to 1.5 t", payloadT: 1.5, speedKmh: 22, costPerTkm: 0.35, fixedUsd: 8, gPerTkm: 260, circuity: 1.3, maxKm: 100, waitH: 0, reeferOk: true, hazmatOk: false, oversizeOk: false, bulkOk: false, drayageOnly: true },
  { id: "van_ev", mode: "urban", label: "Electric delivery van", note: "First/last-mile, up to 1.2 t", payloadT: 1.2, speedKmh: 22, costPerTkm: 0.38, fixedUsd: 8, gPerTkm: 110, circuity: 1.3, maxKm: 100, waitH: 0, reeferOk: true, hazmatOk: false, oversizeOk: false, bulkOk: false, drayageOnly: true },
  { id: "cargo_bike", mode: "urban", label: "E-cargo bike", note: "Parcels only, up to 0.2 t, short urban legs", payloadT: 0.2, speedKmh: 12, costPerTkm: 0.60, fixedUsd: 2, gPerTkm: 15, circuity: 1.2, maxKm: 15, waitH: 0, reeferOk: false, hazmatOk: false, oversizeOk: false, bulkOk: false, drayageOnly: true, maxTonnes: 0.2 },
];

export type CargoId = "general" | "bulk" | "liquid" | "reefer" | "hazmat" | "oversize" | "electronics" | "parcels";
export interface Cargo {
  id: CargoId; label: string; blurb: string; valuePerT: number; defaultTonnes: number;
  costMult: number; handlingMult: number; customsHoursMult: number; reefer?: boolean; hazmat?: boolean; oversize?: boolean;
  allow: (v: Vehicle) => boolean;
}
export const CARGOS: Cargo[] = [
  { id: "general", label: "General (containerised)", blurb: "Standard boxed freight", valuePerT: 3000, defaultTonnes: 40, costMult: 1, handlingMult: 1, customsHoursMult: 1, allow: () => true },
  { id: "bulk", label: "Dry bulk", blurb: "Grain, coal, ore, cement", valuePerT: 300, defaultTonnes: 500, costMult: 0.9, handlingMult: 0.8, customsHoursMult: 1, allow: (v) => v.bulkOk },
  { id: "liquid", label: "Liquid bulk", blurb: "Edible oil, chemicals, fuels", valuePerT: 800, defaultTonnes: 300, costMult: 1.1, handlingMult: 1.1, customsHoursMult: 1.1, allow: (v) => v.bulkOk },
  { id: "reefer", label: "Cold chain (reefer)", blurb: "Temperature-controlled food, pharma", valuePerT: 4500, defaultTonnes: 18, costMult: 1, handlingMult: 1.2, customsHoursMult: 1, reefer: true, allow: (v) => v.reeferOk },
  { id: "hazmat", label: "Hazardous goods", blurb: "Dangerous-goods classes", valuePerT: 1500, defaultTonnes: 30, costMult: 1, handlingMult: 1.3, customsHoursMult: 1.5, hazmat: true, allow: (v) => v.hazmatOk },
  { id: "oversize", label: "Oversize / project cargo", blurb: "Turbines, transformers, heavy machinery", valuePerT: 8000, defaultTonnes: 60, costMult: 1, handlingMult: 1.5, customsHoursMult: 1.3, oversize: true, allow: (v) => v.oversizeOk },
  { id: "electronics", label: "High-value electronics", blurb: "Time-sensitive, high value per tonne", valuePerT: 50000, defaultTonnes: 5, costMult: 1, handlingMult: 1.1, customsHoursMult: 1, allow: () => true },
  { id: "parcels", label: "E-commerce parcels", blurb: "Small consignments, urban delivery", valuePerT: 8000, defaultTonnes: 0.15, costMult: 1, handlingMult: 1, customsHoursMult: 1, allow: (v) => v.mode !== "barge" },
];

export interface Place {
  id: string; name: string; country: string; group: string; lat: number; lon: number;
  port?: string; rail?: boolean; air?: string; waterway?: string; hubKm: number;
}
const P = (id: string, name: string, country: string, group: string, lat: number, lon: number, hubKm: number, x: Partial<Place> = {}): Place => ({ id, name, country, group, lat, lon, hubKm, ...x });
export const PLACES: Place[] = [
  P("delhi", "Delhi NCR", "India", "IN", 28.61, 77.21, 28, { rail: true, air: "DEL" }),
  P("jnpt", "Nhava Sheva (JNPT)", "India", "IN", 18.95, 72.95, 8, { port: "INNSA", rail: true }),
  P("mumbai", "Mumbai", "India", "IN", 19.076, 72.878, 20, { port: "INBOM", rail: true, air: "BOM" }),
  P("ahmedabad", "Ahmedabad", "India", "IN", 23.02, 72.57, 22, { rail: true, air: "AMD" }),
  P("pune", "Pune", "India", "IN", 18.52, 73.86, 20, { rail: true, air: "PNQ" }),
  P("bengaluru", "Bengaluru", "India", "IN", 12.97, 77.59, 30, { rail: true, air: "BLR" }),
  P("chennai", "Chennai", "India", "IN", 13.083, 80.271, 12, { port: "INMAA", rail: true, air: "MAA" }),
  P("hyderabad", "Hyderabad", "India", "IN", 17.39, 78.49, 28, { rail: true, air: "HYD" }),
  P("kochi", "Kochi", "India", "IN", 9.931, 76.267, 10, { port: "INCOK", rail: true, air: "COK" }),
  P("tuticorin", "Tuticorin", "India", "IN", 8.76, 78.19, 6, { port: "INTUT", rail: true }),
  P("vizag", "Visakhapatnam", "India", "IN", 17.687, 83.219, 10, { port: "INVTZ", rail: true, air: "VTZ" }),
  P("paradip", "Paradip", "India", "IN", 20.26, 86.67, 8, { port: "INPBD", rail: true }),
  P("haldia", "Haldia", "India", "IN", 22.03, 88.07, 8, { port: "INHLD", rail: true, waterway: "ganga" }),
  P("kolkata", "Kolkata", "India", "IN", 22.57, 88.36, 20, { rail: true, air: "CCU", waterway: "ganga" }),
  P("patna", "Patna", "India", "IN", 25.59, 85.14, 15, { rail: true, air: "PAT", waterway: "ganga" }),
  P("varanasi", "Varanasi", "India", "IN", 25.32, 82.97, 12, { rail: true, air: "VNS", waterway: "ganga" }),
  P("lucknow", "Lucknow", "India", "IN", 26.85, 80.95, 20, { rail: true, air: "LKO" }),
  P("kanpur", "Kanpur", "India", "IN", 26.45, 80.35, 18, { rail: true }),
  P("jaipur", "Jaipur", "India", "IN", 26.91, 75.79, 22, { rail: true, air: "JAI" }),
  P("ludhiana", "Ludhiana", "India", "IN", 30.9, 75.86, 15, { rail: true }),
  P("nagpur", "Nagpur", "India", "IN", 21.15, 79.09, 18, { rail: true, air: "NAG" }),
  P("bhopal", "Bhopal", "India", "IN", 23.26, 77.41, 18, { rail: true, air: "BHO" }),
  P("indore", "Indore", "India", "IN", 22.72, 75.86, 20, { rail: true, air: "IDR" }),
  P("guwahati", "Guwahati", "India", "IN", 26.14, 91.74, 15, { rail: true, air: "GAU" }),
  P("colombo", "Colombo", "Sri Lanka", "LK", 6.927, 79.861, 8, { port: "LKCMB", air: "CMB", rail: true }),
  P("singapore", "Singapore", "Singapore", "SG", 1.352, 103.82, 20, { port: "SGSIN", air: "SIN" }),
  P("jebelali", "Jebel Ali / Dubai", "UAE", "AE", 25.012, 55.062, 30, { port: "AEJEA", air: "DXB" }),
  P("shanghai", "Shanghai", "China", "CN", 31.23, 121.47, 25, { port: "CNSHA", air: "PVG", rail: true }),
  P("rotterdam", "Rotterdam", "Netherlands", "EU", 51.924, 4.478, 15, { port: "NLRTM", rail: true, waterway: "rhine" }),
  P("antwerp", "Antwerp", "Belgium", "EU", 51.26, 4.4, 15, { port: "BEANR", rail: true, waterway: "rhine" }),
  P("hamburg", "Hamburg", "Germany", "EU", 53.551, 9.994, 15, { port: "DEHAM", rail: true, air: "HAM" }),
  P("duisburg", "Duisburg", "Germany", "EU", 51.43, 6.76, 10, { rail: true, waterway: "rhine" }),
  P("frankfurt", "Frankfurt", "Germany", "EU", 50.11, 8.68, 20, { rail: true, air: "FRA" }),
  P("milan", "Milan", "Italy", "EU", 45.46, 9.19, 25, { rail: true, air: "MXP" }),
  P("losangeles", "Los Angeles", "United States", "US", 33.74, -118.27, 25, { port: "USLAX", rail: true, air: "LAX" }),
  P("chicago", "Chicago", "United States", "US", 41.88, -87.63, 25, { rail: true, air: "ORD" }),
];

/** Operations the planner inserts automatically (shown in every itinerary). */
export const OPERATIONS: { kind: string; label: string; when: string }[] = [
  { kind: "loading", label: "Loading & unloading", when: "At the shipper and at the consignee" },
  { kind: "firstmile", label: "First-mile pickup / last-mile delivery", when: "Between the city and its rail yard, port or airport (truck, van or e-cargo bike)" },
  { kind: "handling", label: "Transshipment / terminal handling", when: "Every time cargo changes mode or train/ship at a hub" },
  { kind: "wait", label: "Wait for departure", when: "Scheduled modes: train, barge, ship, flight" },
  { kind: "customs", label: "Customs clearance", when: "When a leg crosses a national border" },
  { kind: "coldchain", label: "Cold-chain handling", when: "Reefer cargo: refrigerated units and extra handling" },
  { kind: "hazmat", label: "Dangerous-goods handling", when: "Hazmat cargo: restricted modes, extra handling and customs time" },
  { kind: "storage", label: "Warehousing / buffer storage", when: "Optional buffer days at the destination" },
  { kind: "inventory", label: "Inventory carrying cost", when: "Value of goods tied up while in transit" },
  { kind: "carbon", label: "Internal carbon cost", when: "Optional price per tonne of CO₂e" },
];
