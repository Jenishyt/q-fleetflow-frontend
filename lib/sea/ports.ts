import type { Port } from "@/lib/api";

// Real, well-known ports (UN/LOCODE + approximate harbour coordinates). Merged with the
// backend's /ports list by LOCODE so the map still works when the backend is offline.
export const BASE_PORTS: Port[] = [
  { name: "Chennai", country: "India", locode: "INMAA", lat: 13.0827, lon: 80.2707 },
  { name: "Mumbai", country: "India", locode: "INBOM", lat: 19.076, lon: 72.8777 },
  { name: "Cochin", country: "India", locode: "INCOK", lat: 9.9312, lon: 76.2673 },
  { name: "Visakhapatnam", country: "India", locode: "INVTZ", lat: 17.6868, lon: 83.2185 },
  { name: "Colombo", country: "Sri Lanka", locode: "LKCMB", lat: 6.9271, lon: 79.8612 },
  { name: "Singapore", country: "Singapore", locode: "SGSIN", lat: 1.3521, lon: 103.8198 },
  { name: "Jebel Ali (Dubai)", country: "UAE", locode: "AEJEA", lat: 25.0118, lon: 55.0618 },
  { name: "Rotterdam", country: "Netherlands", locode: "NLRTM", lat: 51.9244, lon: 4.4777 },
  { name: "Shanghai", country: "China", locode: "CNSHA", lat: 31.2304, lon: 121.4737 },
  { name: "Tokyo", country: "Japan", locode: "JPTYO", lat: 35.6762, lon: 139.6503 },
  { name: "Hamburg", country: "Germany", locode: "DEHAM", lat: 53.5511, lon: 9.9937 },
  { name: "Los Angeles", country: "United States", locode: "USLAX", lat: 33.7405, lon: -118.2668 },
  { name: "Santos", country: "Brazil", locode: "BRSSZ", lat: -23.9608, lon: -46.3336 },
];

export const EXTRA_PORTS: Port[] = [
  { name: "Nhava Sheva (JNPT)", country: "India", locode: "INNSA", lat: 18.95, lon: 72.95 },
  { name: "Tuticorin", country: "India", locode: "INTUT", lat: 8.76, lon: 78.19 },
  { name: "Paradip", country: "India", locode: "INPBD", lat: 20.26, lon: 86.67 },
  { name: "Chittagong", country: "Bangladesh", locode: "BDCGP", lat: 22.31, lon: 91.8 },
  { name: "Port Klang", country: "Malaysia", locode: "MYPKG", lat: 3.0, lon: 101.39 },
  { name: "Laem Chabang", country: "Thailand", locode: "THLCH", lat: 13.08, lon: 100.88 },
  { name: "Hong Kong", country: "China (SAR)", locode: "HKHKG", lat: 22.3, lon: 114.17 },
  { name: "Kaohsiung", country: "Taiwan", locode: "TWKHH", lat: 22.61, lon: 120.28 },
  { name: "Busan", country: "South Korea", locode: "KRPUS", lat: 35.1, lon: 129.04 },
  { name: "Fujairah", country: "UAE", locode: "AEFJR", lat: 25.12, lon: 56.36 },
  { name: "Salalah", country: "Oman", locode: "OMSLL", lat: 16.94, lon: 54.0 },
  { name: "Jeddah", country: "Saudi Arabia", locode: "SAJED", lat: 21.48, lon: 39.17 },
  { name: "Djibouti", country: "Djibouti", locode: "DJJIB", lat: 11.6, lon: 43.15 },
  { name: "Port Said", country: "Egypt", locode: "EGPSD", lat: 31.26, lon: 32.3 },
  { name: "Piraeus", country: "Greece", locode: "GRPIR", lat: 37.94, lon: 23.64 },
  { name: "Genoa", country: "Italy", locode: "ITGOA", lat: 44.41, lon: 8.93 },
  { name: "Valencia", country: "Spain", locode: "ESVLC", lat: 39.45, lon: -0.32 },
  { name: "Algeciras", country: "Spain", locode: "ESALG", lat: 36.13, lon: -5.44 },
  { name: "Antwerp", country: "Belgium", locode: "BEANR", lat: 51.26, lon: 4.4 },
  { name: "New York / New Jersey", country: "United States", locode: "USNYC", lat: 40.67, lon: -74.04 },
  { name: "Durban", country: "South Africa", locode: "ZADUR", lat: -29.87, lon: 31.03 },
  { name: "Cape Town", country: "South Africa", locode: "ZACPT", lat: -33.91, lon: 18.43 },
  { name: "Mombasa", country: "Kenya", locode: "KEMBA", lat: -4.06, lon: 39.67 },
];

export function mergePorts(remote: Port[] | null): Port[] {
  const m = new Map<string, Port>();
  [...BASE_PORTS, ...EXTRA_PORTS].forEach((p) => m.set(p.locode, p));
  (remote ?? []).forEach((p) => m.set(p.locode, p));
  return [...m.values()];
}

// Countries inside the EU/EEA ETS maritime scope (used only for the indicative ETS estimate).
export const EU_COUNTRIES = new Set(["Netherlands", "Germany", "Belgium", "Spain", "Italy", "Greece", "France", "Portugal", "Poland", "Denmark", "Sweden", "Finland", "Ireland"]);
