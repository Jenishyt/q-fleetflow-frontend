"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api, Port } from "@/lib/api";

export default function PortsPage() {
  const [ports, setPorts] = useState<Port[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.ports().then((r) => setPorts(r.ports)).catch(() => setError("Could not load ports — is the backend running?"));
  }, []);

  const filtered = useMemo(() => {
    if (!ports) return [];
    const q = query.toLowerCase();
    return ports.filter(
      (p) => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q) || p.locode.toLowerCase().includes(q)
    );
  }, [ports, query]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-brass-bright mb-3">
        Reference data
      </motion.p>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl mb-6">
        Ports database
      </motion.h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, country, or UN/LOCODE..."
        className="w-full bg-ink-raised border rule rounded-sm px-4 py-2.5 text-sm mb-6 focus:outline-none focus:border-brass"
      />

      {error && <p className="text-alert text-sm">{error}</p>}
      {!ports && !error && <p className="text-paper/50 text-sm font-mono">Loading...</p>}

      {ports && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b rule text-left text-paper/50 font-mono text-xs">
              <th className="py-2 font-normal">Name</th>
              <th className="py-2 font-normal">Country</th>
              <th className="py-2 font-normal">LOCODE</th>
              <th className="py-2 font-normal">Coordinates</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <motion.tr
                key={p.locode}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className="border-b rule/50"
              >
                <td className="py-2">{p.name}</td>
                <td className="py-2 text-paper/70">{p.country}</td>
                <td className="py-2 font-mono text-xs text-brass-bright">{p.locode}</td>
                <td className="py-2 font-mono text-xs text-paper/50">{p.lat.toFixed(3)}, {p.lon.toFixed(3)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      )}
      {ports && filtered.length === 0 && <p className="text-paper/40 text-sm mt-4">No ports match "{query}"</p>}
    </div>
  );
}
