"use client";

import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-61px)] flex items-center justify-center font-mono text-xs text-paper/50">
      <span className="animate-pulse">Charting the seas…</span>
    </div>
  ),
});

export default function MapPage() {
  return <MapClient />;
}
