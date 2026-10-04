"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, ZoomControl, ScaleControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MODE_STYLE, type Place } from "@/lib/logistics/data";
import type { Option } from "@/lib/logistics/planner";
import { BASE_LAYERS } from "@/components/map/layers";

interface Props {
  places: Place[]; origin: Place | null; dest: Place | null; option: Option | null; fitSignal: number;
  onPick: (p: Place) => void; onSet: (kind: "from" | "to", p: Place) => void;
}
const DASH: Record<string, string | undefined> = { road: undefined, rail: "9 6", barge: "1 7", sea: undefined, air: "4 9", urban: "2 4" };

function icon(color: string, size: number, pulse = false) {
  return L.divIcon({ className: "port-marker", html: `<div class="pm ${pulse ? "pm-pulse" : ""}" style="--c:${color};width:${size}px;height:${size}px"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}
const colorOf = (p: Place) => (p.port ? "#4fb3d9" : p.air ? "#c58bd0" : p.rail ? "#7fb8ff" : "#d2a35c");

function Fit({ pts, signal }: { pts: [number, number][]; signal: number }) {
  const map = useMap();
  useEffect(() => {
    if (pts.length < 2) return;
    const mobile = window.innerWidth < 768;
    map.flyToBounds(L.latLngBounds(pts), { paddingTopLeft: mobile ? [24, 90] : [420, 70], paddingBottomRight: mobile ? [24, 340] : [60, 60], duration: 1.3, maxZoom: 6 });
  }, [pts, signal, map]);
  return null;
}

function PlacePopup({ p, onSet }: { p: Place; onSet: Props["onSet"] }) {
  const map = useMap();
  const caps = [p.port && "Port", p.rail && "Rail terminal", p.air && `Airport ${p.air}`, p.waterway && `Waterway (${p.waterway})`].filter(Boolean).join(" · ") || "Road only";
  return (
    <div className="min-w-[190px]">
      <div className="font-display text-base leading-tight text-paper">{p.name}</div>
      <div className="font-mono text-[11px] text-paper/50 mb-1">{p.country}</div>
      <div className="text-[11px] text-paper/60 mb-3">{caps}</div>
      <div className="flex gap-2">
        <button className="popup-btn popup-btn-o" onClick={() => { onSet("from", p); map.closePopup(); }}>From here</button>
        <button className="popup-btn popup-btn-d" onClick={() => { onSet("to", p); map.closePopup(); }}>To here</button>
      </div>
    </div>
  );
}

export default function LogisticsMap({ places, origin, dest, option, fitSignal, onPick, onSet }: Props) {
  const base = BASE_LAYERS[0];
  const draw = useMemo(() => {
    if (!option) return { segs: [], stops: [], end: null as [number, number] | null };
    let off = 0;
    const segs: { id: string; mode: string; color: string; pts: [number, number][]; tip: string }[] = [];
    const stops: { name: string; pos: [number, number] }[] = [];
    let end: [number, number] | null = null;
    option.legs.filter((l) => l.role === "main").forEach((l, i) => {
      const pts = l.path.map(([lon, lat]) => [lat, lon + off] as [number, number]);
      const last = pts[pts.length - 1];
      off = last[1] - l.to.lon;
      segs.push({ id: `${i}-${l.vehicle.id}`, mode: l.vehicle.mode, color: MODE_STYLE[l.vehicle.mode].color, pts, tip: `${MODE_STYLE[l.vehicle.mode].icon} ${l.vehicle.label}: ${l.from.name} → ${l.to.name} · ${Math.round(l.distKm).toLocaleString()} km · ${(l.hours / 24).toFixed(1)} d` });
      stops.push({ name: l.to.name, pos: last });
      end = last;
    });
    return { segs, stops, end };
  }, [option]);
  const fitPts = useMemo(() => draw.segs.flatMap((s) => s.pts), [draw]);

  return (
    <MapContainer center={[22, 60]} zoom={3} minZoom={2} maxZoom={base.maxZoom} zoomSnap={0.5} worldCopyJump zoomControl={false} preferCanvas style={{ height: "100%", width: "100%", background: "#0b1f2e" }}>
      <TileLayer url={base.url} attribution={base.attribution} maxZoom={base.maxZoom} />
      {base.overlays?.map((o, i) => <TileLayer key={i} url={o.url} maxZoom={base.maxZoom} pane="shadowPane" />)}
      <ZoomControl position="bottomright" /><ScaleControl position="bottomright" imperial={false} />
      <Fit pts={fitPts} signal={fitSignal} />

      {draw.segs.map((s) => (
        <Polyline key={`g${s.id}`} positions={s.pts} interactive={false} pathOptions={{ color: s.color, weight: 9, opacity: 0.14, lineCap: "round" }} />
      ))}
      {draw.segs.map((s) => (
        <Polyline key={s.id} positions={s.pts} pathOptions={{ color: s.color, weight: s.mode === "sea" ? 3.6 : 3, opacity: 0.95, dashArray: DASH[s.mode], lineCap: "round", className: s.mode === "air" || s.mode === "rail" ? "route-flow" : "" }}>
          <Tooltip sticky className="glass-tip">{s.tip}</Tooltip>
        </Polyline>
      ))}
      {draw.stops.slice(0, -1).map((s, i) => <Marker key={`st${i}`} position={s.pos} icon={icon("#f4d9a6", 11)} zIndexOffset={400}><Tooltip direction="top" offset={[0, -6]} className="glass-tip">Transfer hub: {s.name}</Tooltip></Marker>)}

      {places.flatMap((p) => [-360, 0, 360].map((o) => {
        if (origin?.id === p.id || dest?.id === p.id) return null;
        return (
          <Marker key={`${p.id}${o}`} position={[p.lat, p.lon + o]} icon={icon(colorOf(p), 9)} eventHandlers={{ click: () => onPick(p) }}>
            <Tooltip direction="top" offset={[0, -5]} className="glass-tip">{p.name}</Tooltip>
            <Popup className="glass-popup"><PlacePopup p={p} onSet={onSet} /></Popup>
          </Marker>
        );
      }))}
      {origin && <Marker position={[origin.lat, origin.lon]} icon={icon("#6fd08c", 18, true)} zIndexOffset={900}><Tooltip permanent direction="top" offset={[0, -10]} className="glass-tip glass-tip-o">{origin.name}</Tooltip></Marker>}
      {dest && <Marker position={draw.end ?? [dest.lat, dest.lon]} icon={icon("#f08a6b", 18, true)} zIndexOffset={900}><Tooltip permanent direction="top" offset={[0, -10]} className="glass-tip glass-tip-d">{dest.name}</Tooltip></Marker>}
    </MapContainer>
  );
}
