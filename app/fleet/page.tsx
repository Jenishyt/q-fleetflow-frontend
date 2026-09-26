"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, Vessel } from "@/lib/api";

const VESSEL_CLASSES = ["container", "bulk_carrier", "tanker", "general_cargo"];
const FUEL_TYPES = ["MDO", "VLSFO", "HFO", "LNG"];

export default function FleetPage() {
  const [vessels, setVessels] = useState<Vessel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [vesselClass, setVesselClass] = useState("container");
  const [fuelType, setFuelType] = useState("VLSFO");
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    api.fleet().then((r) => setVessels(r.vessels)).catch(() => setError("Could not load fleet — is the backend running?"));
  }

  useEffect(refresh, []);

  async function handleRegister() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await api.registerVessel({ name, vessel_class: vesselClass, fuel_type: fuelType });
      setName("");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-brass-bright mb-3">
        Fleet management
      </motion.p>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl mb-2">
        Fleet registry
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="text-paper/60 text-sm mb-8 max-w-xl"
      >
        Every spec below comes from the same constants the optimizer and prediction engine
        actually use — register a "tanker" and its capacity is the real 60,000 DWT our
        physics model assumes, not a made-up number.
      </motion.p>

      <div className="border rule rounded-sm bg-ink-raised p-5 mb-8">
        <p className="text-xs text-paper/50 mb-4">Register a vessel</p>
        <div className="grid md:grid-cols-4 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vessel name"
            className="bg-ink border rule rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-brass"
          />
          <select
            value={vesselClass}
            onChange={(e) => setVesselClass(e.target.value)}
            className="bg-ink border rule rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-brass"
          >
            {VESSEL_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value)}
            className="bg-ink border rule rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-brass"
          >
            {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRegister}
            disabled={submitting || !name.trim()}
            className="bg-brass text-ink rounded-sm px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Registering..." : "Register"}
          </motion.button>
        </div>
      </div>

      {error && <p className="text-alert text-sm mb-4">{error}</p>}
      {!vessels && !error && <p className="text-paper/50 text-sm font-mono">Loading...</p>}

      {vessels && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b rule text-left text-paper/50 font-mono text-xs">
              <th className="py-2 font-normal">ID</th>
              <th className="py-2 font-normal">Name</th>
              <th className="py-2 font-normal">Class</th>
              <th className="py-2 font-normal">Capacity</th>
              <th className="py-2 font-normal">Design speed</th>
              <th className="py-2 font-normal">Fuel</th>
              <th className="py-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {vessels.map((v) => (
                <motion.tr
                  key={v.id}
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  className="border-b rule/50"
                >
                  <td className="py-2 font-mono text-xs text-paper/50">{v.id}</td>
                  <td className="py-2">{v.name}</td>
                  <td className="py-2 text-paper/70">{v.vessel_class}</td>
                  <td className="py-2 font-mono text-xs">{v.capacity_dwt.toLocaleString()} DWT</td>
                  <td className="py-2 font-mono text-xs">{v.design_speed_kn} kn</td>
                  <td className="py-2 font-mono text-xs">{v.fuel_type}</td>
                  <td className="py-2">
                    <span className={`text-xs ${v.status === "Available" ? "text-signal" : "text-alert"}`}>
                      {v.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      )}
    </div>
  );
}
