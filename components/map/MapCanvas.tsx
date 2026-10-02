"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Popup, Tooltip, ScaleControl, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Port } from "@/lib/api";
import { LANE_EDGES, LANE_NODES, type LngLat } from "@/lib/sea/lanes";
import { CHOKEPOINTS, haversineNm, pointAlong, type SeaRoute } from "@/lib/sea/router";
import { ZONES, wrapLon } from "@/lib/sea/zones";
import { BASE_LAYERS, OWM_KEY, SEAMARK_ATTR, SEAMARK_URL, owmUrl, type LayerState } from "./layers";

export interface Pin { id: string; label: string; color: string; route: SeaRoute }

interface Props {
  ports: Port[];
  origin: Port | null;
  dest: Port | null;
  active: SeaRoute | null;
  pins: Pin[];
  layers: LayerState;
  radarUrl: string | null;
  replayT: number | null;
  fitSignal: number;
  onPortClick: (p: Port) => void;
  onSetOrigin: (p: Port) => void;
  onSetDest: (p: Port) => void;
}

const ll = (p: LngLat): [number, number] => [p[1], p[0]];

function portIcon(kind: "origin" | "dest" | "port" | "dim") {
  const cfg = {
    origin: { c: "#6fd08c", s: 18, pulse: true },
    dest: { c: "#f08a6b", s: 18, pulse: true },
    port: { c: "#d2a35c", s: 11, pulse: false },
    dim: { c: "#5d93a6", s: 8, pulse: false },
  }[kind];
  return L.divIcon({
    className: "port-marker",
    html: `<div class="pm ${cfg.pulse ? "pm-pulse" : ""}" style="--c:${cfg.c};width:${cfg.s}px;height:${cfg.s}px"></div>`,
    iconSize: [cfg.s, cfg.s],
    iconAnchor: [cfg.s / 2, cfg.s / 2],
  });
}
const CHOKE_ICON = L.divIcon({ className: "choke-marker", html: '<div class="ck"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });

/** Fly the viewport to the active route whenever it changes (or the Fit button is pressed). */
function FitRoute({ route, signal }: { route: SeaRoute | null; signal: number }) {
  const map = useMap();
  useEffect(() => {
    if (!route) return;
    const mobile = window.innerWidth < 768;
    map.flyToBounds(L.latLngBounds(route.path.map(ll)), {
      paddingTopLeft: mobile ? [24, 90] : [400, 70],
      paddingBottomRight: mobile ? [24, 330] : [60, 60],
      duration: 1.4, easeLinearity: 0.25, maxZoom: 7,
    });
  }, [route, signal, map]);
  return null;
}

/** Planned-voyage preview marker, moved imperatively so replay stays at 60fps without re-rendering React. */
function ShipMarker({ route, t }: { route: SeaRoute | null; t: number | null }) {
  const map = useMap();
  const ref = useRef<L.Marker | null>(null);
  useEffect(() => {
    const icon = L.divIcon({
      className: "ship-marker",
      html: '<div class="ship-ring"></div><div class="ship-inner"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 1.5 L18.5 21 L12 17 L5.5 21 Z" fill="#f4d9a6" stroke="#0b1f2e" stroke-width="1.3" stroke-linejoin="round"/></svg></div>',
      iconSize: [30, 30], iconAnchor: [15, 15],
    });
    const m = L.marker([0, 0], { icon, interactive: false, zIndexOffset: 2000, opacity: 0 }).addTo(map);
    ref.current = m;
    return () => { m.remove(); ref.current = null; };
  }, [map]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    if (!route || t === null) { m.setOpacity(0); return; }
    const { pos, bearing } = pointAlong(route.path, t);
    m.setLatLng(ll(pos));
    m.setOpacity(1);
    const el = m.getElement()?.querySelector<HTMLElement>(".ship-inner");
    if (el) el.style.transform = `rotate(${bearing}deg)`;
  }, [route, t]);
  return null;
}

function CursorReadout() {
  const [pos, setPos] = useState<L.LatLng | null>(null);
  const raf = useRef(0);
  useMapEvents({
    mousemove(e) {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => setPos(e.latlng));
    },
    mouseout() { setPos(null); },
  });
  if (!pos) return null;
  const lat = pos.lat, lon = wrapLon(pos.lng);
  return (
    <div className="absolute bottom-3 left-3 md:left-[400px] z-[900] pointer-events-none glass rounded-sm px-2.5 py-1 font-mono text-[11px] text-paper/70">
      {Math.abs(lat).toFixed(3)}°{lat >= 0 ? "N" : "S"} {Math.abs(lon).toFixed(3)}°{lon >= 0 ? "E" : "W"}
    </div>
  );
}

/** Click on open water -> popup with coordinates and the nearest port. */
function ProbeClicks({ ports }: { ports: Port[] }) {
  const map = useMap();
  useMapEvents({
    click(e) {
      const lon = wrapLon(e.latlng.lng);
      let best: Port | null = null, bd = Infinity;
      for (const p of ports) {
        const d = haversineNm([lon, e.latlng.lat], [p.lon, p.lat]);
        if (d < bd) { bd = d; best = p; }
      }
      const html = `<div class="probe"><div class="probe-h">${Math.abs(e.latlng.lat).toFixed(2)}°${e.latlng.lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}</div>${
        best ? `<div class="probe-b">Nearest port: <b>${best.name}</b> · ${Math.round(bd).toLocaleString()} nm</div>` : ""
      }</div>`;
      L.popup({ closeButton: false, className: "glass-popup", offset: [0, 4] }).setLatLng(e.latlng).setContent(html).openOn(map);
    },
  });
  return null;
}

function PortPopup({ port, onSetOrigin, onSetDest }: { port: Port; onSetOrigin: (p: Port) => void; onSetDest: (p: Port) => void }) {
  const map = useMap();
  return (
    <div className="min-w-[190px]">
      <div className="font-display text-base leading-tight text-paper">{port.name}</div>
      <div className="font-mono text-[11px] text-paper/50 mb-2">{port.locode} · {port.country}</div>
      <div className="font-mono text-[11px] text-paper/50 mb-3">{port.lat.toFixed(3)}, {port.lon.toFixed(3)}</div>
      <div className="flex gap-2">
        <button className="popup-btn popup-btn-o" onClick={() => { onSetOrigin(port); map.closePopup(); }}>From here</button>
        <button className="popup-btn popup-btn-d" onClick={() => { onSetDest(port); map.closePopup(); }}>To here</button>
      </div>
      <a className="block mt-2 text-[11px] text-brass-bright hover:underline" target="_blank" rel="noreferrer"
        href={`https://map.openseamap.org/?zoom=11&lat=${port.lat}&lon=${port.lon}`}>Open harbour in OpenSeaMap ↗</a>
    </div>
  );
}

export default function MapCanvas(p: Props) {
  const base = BASE_LAYERS.find((b) => b.id === p.layers.base) ?? BASE_LAYERS[0];

  const laneLines = useMemo(() => {
    return LANE_EDGES.map(([a, b]) => {
      const A = LANE_NODES[a], B = LANE_NODES[b];
      let bx = B[0];
      if (bx - A[0] > 180) bx -= 360;
      else if (A[0] - bx > 180) bx += 360;
      return [ll(A), ll([bx, B[1]])] as [number, number][];
    });
  }, []);

  const activePositions = useMemo(() => (p.active ? p.active.path.map(ll) : []), [p.active]);
  const chokeMarks = useMemo(() => {
    if (!p.active) return [];
    const out: { name: string; pos: [number, number] }[] = [];
    const seen = new Set<string>();
    p.active.nodeIds.forEach((id, i) => {
      const nm = CHOKEPOINTS[id];
      if (nm && !seen.has(nm)) { seen.add(nm); out.push({ name: nm, pos: ll(p.active!.path[i + 1]) }); }
    });
    return out;
  }, [p.active]);

  const icons = useMemo(() => ({ origin: portIcon("origin"), dest: portIcon("dest"), port: portIcon("port"), dim: portIcon("dim") }), []);
  const routePorts = useMemo(() => new Set(p.pins.flatMap((x) => [x.route.from.locode, x.route.to.locode])), [p.pins]);

  return (
    <MapContainer
      center={[16, 72]} zoom={4} minZoom={2} maxZoom={base.maxZoom} zoomSnap={0.5} zoomDelta={0.5} wheelPxPerZoomLevel={90}
      worldCopyJump zoomControl={false} preferCanvas style={{ height: "100%", width: "100%", background: "#0b1f2e" }}
    >
      <TileLayer key={base.id} url={base.url} attribution={base.attribution} maxZoom={base.maxZoom} subdomains={base.subdomains ?? "abc"} />
      {base.overlays?.map((o, i) => <TileLayer key={`${base.id}-o${i}`} url={o.url} maxZoom={base.maxZoom} pane="shadowPane" />)}
      {p.layers.seamark && <TileLayer url={SEAMARK_URL} attribution={SEAMARK_ATTR} maxZoom={18} minZoom={4} />}
      {p.layers.radar && p.radarUrl && <TileLayer url={p.radarUrl} opacity={0.65} maxNativeZoom={7} attribution='Radar &copy; <a href="https://www.rainviewer.com">RainViewer</a>' />}
      {p.layers.owm && OWM_KEY && <TileLayer url={owmUrl(p.layers.owm)} opacity={0.7} attribution='Weather &copy; <a href="https://openweathermap.org">OpenWeather</a>' />}

      <ZoomControl position="bottomright" />
      <ScaleControl position="bottomright" imperial={false} />
      <ProbeClicks ports={p.ports} />
      <CursorReadout />
      <FitRoute route={p.active} signal={p.fitSignal} />

      {/* zones */}
      {ZONES.filter((z) => (z.kind === "advisory" ? p.layers.zones : p.layers.eca)).map((z) => (
        <Polygon key={z.id} positions={z.ring.map(ll)}
          pathOptions={z.kind === "advisory"
            ? { color: "#e0644a", weight: 1.2, fillColor: "#e0644a", fillOpacity: 0.16, dashArray: "5 4" }
            : { color: "#4fb3d9", weight: 1.2, fillColor: "#4fb3d9", fillOpacity: 0.1, dashArray: "2 5" }}>
          <Popup className="glass-popup">
            <div className="max-w-[240px]">
              <div className="font-display text-base text-paper">{z.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider mb-1.5" style={{ color: z.kind === "advisory" ? "#f08a6b" : "#7fd0ee" }}>
                {z.kind === "advisory" ? "Advisory area (indicative)" : "Emission control area (indicative)"}
              </div>
              <div className="text-xs text-paper/70 leading-relaxed">{z.note}</div>
            </div>
          </Popup>
        </Polygon>
      ))}

      {/* lane network */}
      {p.layers.lanes && laneLines.map((pos, i) => (
        <Polyline key={i} positions={pos} interactive={false} pathOptions={{ color: "#7fd0ee", weight: 0.9, opacity: 0.35 }} />
      ))}

      {/* pinned (compare) routes */}
      {p.pins.map((pin) => (
        <Polyline key={pin.id} positions={pin.route.path.map(ll)} pathOptions={{ color: pin.color, weight: 2.6, opacity: 0.8 }}>
          <Tooltip sticky>{pin.label}: {Math.round(pin.route.distanceNm).toLocaleString()} nm</Tooltip>
        </Polyline>
      ))}

      {/* active route: glow + animated flow + dotted harbour approaches */}
      {p.active && activePositions.length > 1 && (
        <>
          <Polyline key={`g-${p.active.from.locode}-${p.active.to.locode}-${p.active.nodeIds.length}`} positions={activePositions.slice(1, -1)} interactive={false}
            pathOptions={{ color: "#f4d9a6", weight: 9, opacity: 0.16, lineCap: "round", lineJoin: "round" }} />
          <Polyline key={`f-${p.active.from.locode}-${p.active.to.locode}-${p.active.nodeIds.length}`} positions={activePositions.slice(1, -1)} interactive={false}
            pathOptions={{ color: "#f4d9a6", weight: 3, opacity: 0.95, dashArray: "10 8", className: "route-flow", lineCap: "round", lineJoin: "round" }} />
          <Polyline positions={activePositions.slice(0, 2)} interactive={false} pathOptions={{ color: "#f4d9a6", weight: 1.6, opacity: 0.8, dashArray: "2 6" }} />
          <Polyline positions={activePositions.slice(-2)} interactive={false} pathOptions={{ color: "#f4d9a6", weight: 1.6, opacity: 0.8, dashArray: "2 6" }} />
          {chokeMarks.map((c) => (
            <Marker key={c.name} position={c.pos} icon={CHOKE_ICON} zIndexOffset={500}>
              <Tooltip direction="top" offset={[0, -8]} className="glass-tip">{c.name}</Tooltip>
            </Marker>
          ))}
        </>
      )}

      {/* ports - rendered in 3 world copies so they stay visible across the antimeridian */}
      {p.layers.ports && p.ports.flatMap((port) =>
        [-360, 0, 360].map((off) => {
          const isO = p.origin?.locode === port.locode, isD = p.dest?.locode === port.locode;
          if (isO || isD) return null; // drawn separately at the route's unwrapped endpoints
          const kind = routePorts.has(port.locode) ? "port" : "dim";
          return (
            <Marker key={`${port.locode}${off}`} position={[port.lat, port.lon + off]} icon={icons[kind]}
              eventHandlers={{ click: () => p.onPortClick(port) }}>
              <Tooltip direction="top" offset={[0, -6]} className="glass-tip">{port.name}</Tooltip>
              <Popup className="glass-popup"><PortPopup port={port} onSetOrigin={p.onSetOrigin} onSetDest={p.onSetDest} /></Popup>
            </Marker>
          );
        })
      )}

      {/* origin / destination markers at the route's own (possibly unwrapped) coordinates */}
      {p.origin && (
        <Marker position={p.active ? ll(p.active.path[0]) : [p.origin.lat, p.origin.lon]} icon={icons.origin} zIndexOffset={900}>
          <Tooltip permanent direction="top" offset={[0, -10]} className="glass-tip glass-tip-o">{p.origin.name}</Tooltip>
        </Marker>
      )}
      {p.dest && (
        <Marker position={p.active ? ll(p.active.path[p.active.path.length - 1]) : [p.dest.lat, p.dest.lon]} icon={icons.dest} zIndexOffset={900}>
          <Tooltip permanent direction="top" offset={[0, -10]} className="glass-tip glass-tip-d">{p.dest.name}</Tooltip>
        </Marker>
      )}

      <ShipMarker route={p.active} t={p.replayT} />
    </MapContainer>
  );
}
