"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api, RouteGeometry } from "@/lib/api";

const portIcon = L.divIcon({
  className: "",
  html: `<div style="width:10px;height:10px;border-radius:50%;background:#b8863b;border:2px solid #e7e4d6;box-shadow:0 0 6px rgba(184,134,59,0.6)"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

export default function MapClient() {
  const [routes, setRoutes] = useState<RouteGeometry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.routes().then((r) => setRoutes(r.routes)).catch(() => setError("Could not load routes — is the backend running?"));
  }, []);

  if (error) return <p className="text-alert text-sm">{error}</p>;
  if (!routes) return <p className="text-paper/50 text-sm font-mono">Loading routes...</p>;

  const validRoutes = routes.filter((r) => r.origin && r.destination);

  return (
    <div className="border rule rounded-sm overflow-hidden" style={{ height: 520 }}>
      <MapContainer
        center={[10, 85]}
        zoom={4}
        style={{ height: "100%", width: "100%", background: "#0b1f2e" }}
      >
        {/* Esri's raster REST tile service - free, no API key, confirmed
            keyless as of Sep 2026 (unlike CARTO's basemaps, which started
            requiring a paid key that same month - see the map-tiles note
            in chat). NOTE the {z}/{y}/{x} order: Esri's REST tile endpoint
            uses this ordering, not the {z}/{x}/{y} standard everyone else
            (OSM, CARTO, Leaflet's own docs) uses - a common gotcha. */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, FAO, NOAA, USGS'
          maxZoom={16}
        />
        {validRoutes.map((r) => (
          <Polyline
            key={r.name}
            positions={[
              [r.origin!.lat, r.origin!.lon],
              [r.destination!.lat, r.destination!.lon],
            ]}
            pathOptions={{ color: "#b8863b", weight: 1.5, opacity: 0.7, dashArray: "4 4" }}
          />
        ))}
        {validRoutes.flatMap((r) => [r.origin!, r.destination!]).map((p, i) => (
          <Marker key={`${p.locode}-${i}`} position={[p.lat, p.lon]} icon={portIcon}>
            <Popup>
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                {p.name} ({p.locode})<br />{p.country}
              </span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
