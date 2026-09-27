"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api, Port, RouteGeometry } from "@/lib/api";

function makeIcon(color: string, size: number) {
  return L.divIcon({
    className: "port-marker",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #e7e4d6;box-shadow:0 0 6px ${color}99;transition:transform 0.15s"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
const routeIcon = makeIcon("#b8863b", 12);
const otherIcon = makeIcon("#1b4b5a", 7);
const selectedIcon = makeIcon("#d2a35c", 15);

export default function MapClient() {
  const [routes, setRoutes] = useState<RouteGeometry[] | null>(null);
  const [allPorts, setAllPorts] = useState<Port[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteGeometry | null>(null);

  useEffect(() => {
    Promise.all([api.routes(), api.ports()])
      .then(([r, p]) => { setRoutes(r.routes); setAllPorts(p.ports); })
      .catch(() => setError("Could not load map data — is the backend running?"));
  }, []);

  const routePortNames = useMemo(() => {
    if (!routes) return new Set<string>();
    const s = new Set<string>();
    routes.forEach((r) => { if (r.origin) s.add(r.origin.name); if (r.destination) s.add(r.destination.name); });
    return s;
  }, [routes]);

  const routesTouchingSelected = useMemo(() => {
    if (!routes || !selectedPort) return routes ?? [];
    return routes.filter((r) => r.origin?.name === selectedPort || r.destination?.name === selectedPort);
  }, [routes, selectedPort]);

  if (error) return <p className="text-alert text-sm">{error}</p>;
  if (!routes || !allPorts) return <p className="text-paper/50 text-sm font-mono">Loading routes and ports...</p>;

  const validRoutes = (selectedPort ? routesTouchingSelected : routes).filter((r) => r.origin && r.destination);

  return (
    <div>
      <style>{`
        .port-marker:hover div { transform: scale(1.5); }
        .route-line { cursor: pointer; transition: filter 0.2s; }
        .route-line:hover { filter: brightness(1.4); }
      `}</style>
      <div className="grid md:grid-cols-[1fr_260px] gap-4">
        <div className="border rule rounded-sm overflow-hidden" style={{ height: 520 }}>
          <MapContainer center={[10, 85]} zoom={4} style={{ height: "100%", width: "100%", background: "#0b1f2e" }}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, FAO, NOAA, USGS'
              maxZoom={16}
            />

            {validRoutes.map((r) => (
              <Polyline
                key={r.name}
                positions={[[r.origin!.lat, r.origin!.lon], [r.destination!.lat, r.destination!.lon]]}
                pathOptions={{
                  color: selectedRoute?.name === r.name ? "#d2a35c" : "#b8863b",
                  weight: selectedRoute?.name === r.name ? 3.5 : 2,
                  opacity: 0.85, dashArray: "4 4", className: "route-line",
                }}
                eventHandlers={{ click: () => setSelectedRoute(selectedRoute?.name === r.name ? null : r) }}
              />
            ))}

            {allPorts.map((p) => {
              const onRoute = routePortNames.has(p.name);
              const isSelected = selectedPort === p.name;
              return (
                <Marker
                  key={p.locode}
                  position={[p.lat, p.lon]}
                  icon={isSelected ? selectedIcon : onRoute ? routeIcon : otherIcon}
                  eventHandlers={{ click: () => setSelectedPort(isSelected ? null : p.name) }}
                >
                  <Popup>
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {p.name} ({p.locode})<br />{p.country}
                      {onRoute && <><br /><em>on an active route</em></>}
                    </span>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        <div className="border rule rounded-sm bg-ink-raised p-4 text-xs">
          {selectedRoute ? (
            <div>
              <p className="text-brass-bright font-mono mb-2">{selectedRoute.name}</p>
              <div className="space-y-2 text-paper/70">
                <p><b className="text-paper">Route:</b> {selectedRoute.origin?.name} → {selectedRoute.destination?.name}</p>
                <p><b className="text-paper">Distance:</b> {selectedRoute.distance_nm} nm</p>
                <p><b className="text-paper">Demand:</b> {selectedRoute.demand_dwt_per_week.toLocaleString()} DWT/week</p>
                <p><b className="text-paper">Fuels available:</b> {selectedRoute.fuel_availability.join(", ")}</p>
              </div>
              <button onClick={() => setSelectedRoute(null)} className="mt-3 text-brass-bright hover:text-brass">
                Clear ×
              </button>
            </div>
          ) : (
            <p className="text-paper/40">Click a route line (dashed) to see its distance, demand, and fuel availability. Click a port to filter routes touching it.</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 mt-3 text-xs text-paper/50">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-brass inline-block" /> on an active route (4)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-depth inline-block" /> reference port ({allPorts.length - routePortNames.size})</span>
        {selectedPort && (
          <button onClick={() => setSelectedPort(null)} className="text-brass-bright hover:text-brass ml-auto">
            Clear port filter: {selectedPort} ×
          </button>
        )}
      </div>
    </div>
  );
}
