export interface BaseLayer {
  id: string; label: string; url: string; attribution: string; maxZoom: number;
  subdomains?: string; overlays?: { url: string; attribution?: string }[]; needsKey?: string;
}

const esri = "https://server.arcgisonline.com/ArcGIS/rest/services";
const ESRI_ATTR = '&copy; <a href="https://www.esri.com">Esri</a>, GEBCO, NOAA, USGS, Garmin, HERE';
export const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";
export const OWM_KEY = process.env.NEXT_PUBLIC_OWM_KEY || "";

// All base maps below work with NO API key. A MapTiler key (optional) unlocks high-res satellite.
export const BASE_LAYERS: BaseLayer[] = [
  { id: "dark", label: "Dark", url: `${esri}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, attribution: ESRI_ATTR, maxZoom: 16,
    overlays: [{ url: `${esri}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}` }] },
  { id: "ocean", label: "Ocean / bathymetry", url: `${esri}/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}`, attribution: ESRI_ATTR, maxZoom: 13,
    overlays: [{ url: `${esri}/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}` }] },
  { id: "satellite", label: "Satellite", url: `${esri}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, attribution: ESRI_ATTR, maxZoom: 17,
    overlays: [{ url: `${esri}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}` }] },
  { id: "light", label: "Light", url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>', maxZoom: 19, subdomains: "abcd" },
  ...(MAPTILER_KEY
    ? [{ id: "satellite-hd", label: "Satellite HD", url: `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
        attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; OSM contributors', maxZoom: 20, needsKey: "MapTiler" } as BaseLayer]
    : []),
];

export const SEAMARK_URL = "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png";
export const SEAMARK_ATTR = 'Seamarks &copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors';

export const OWM_LAYERS = [
  { id: "wind_new", label: "Wind" }, { id: "clouds_new", label: "Clouds" },
  { id: "pressure_new", label: "Pressure" }, { id: "temp_new", label: "Temperature" },
];
export const owmUrl = (layer: string) => `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${OWM_KEY}`;

export interface LayerState {
  base: string; seamark: boolean; lanes: boolean; zones: boolean; eca: boolean; ports: boolean; radar: boolean; owm: string;
}
export const DEFAULT_LAYERS: LayerState = { base: "dark", seamark: false, lanes: false, zones: true, eca: false, ports: true, radar: false, owm: "" };
