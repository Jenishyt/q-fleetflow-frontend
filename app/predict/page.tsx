"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import AnimatedNumber from "@/components/AnimatedNumber";

const VESSEL_CLASSES = ["container", "bulk_carrier", "tanker", "general_cargo"];
const FUEL_TYPES = ["MDO", "VLSFO", "HFO", "LNG"];

type PredictResult = {
  fuel_t_per_day: number;
  q10: number;
  q90: number;
  shap_top3: [string, number][];
};

export default function PredictPage() {
  const [vesselClass, setVesselClass] = useState("container");
  const [speedKn, setSpeedKn] = useState(18);
  const [draftRatio, setDraftRatio] = useState(0.75);
  const [windKn, setWindKn] = useState(10);
  const [waveHsM, setWaveHsM] = useState(1.0);
  const [fuelType, setFuelType] = useState("VLSFO");

  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      setError(null);
      api
        .predict({ vessel_class: vesselClass, speed_kn: speedKn, draft_ratio: draftRatio, wind_kn: windKn, wave_hs_m: waveHsM, fuel_type: fuelType })
        .then((r) => setResult(r as PredictResult))
        .catch((e) => setError(e instanceof Error ? e.message : "prediction failed"))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(handle);
  }, [vesselClass, speedKn, draftRatio, windKn, waveHsM, fuelType]);

  const maxAbsShap = result ? Math.max(...result.shap_top3.map(([, v]) => Math.abs(v)), 0.001) : 1;
  const rangeSpan = result ? result.q90 * 1.3 : 1;

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-brass-bright mb-3">
        Prediction engine
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="font-display text-3xl mb-2"
      >
        Fuel prediction explorer
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="text-paper/60 text-sm mb-10 max-w-xl"
      >
        Physics-anchored prediction, live. Drag any control — the fuel estimate and its
        SHAP explanation update as you go, no submit button.
      </motion.p>

      <div className="grid md:grid-cols-[1fr_1fr] gap-12">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
          <Select label="Vessel class" value={vesselClass} onChange={setVesselClass} options={VESSEL_CLASSES} />
          <Slider label="Speed" value={speedKn} onChange={setSpeedKn} min={8} max={24} step={0.5} unit="kn" />
          <Slider label="Draft ratio" value={draftRatio} onChange={setDraftRatio} min={0.3} max={1.0} step={0.05} unit="" />
          <Slider label="Wind" value={windKn} onChange={setWindKn} min={0} max={40} step={1} unit="kn" />
          <Slider label="Wave height" value={waveHsM} onChange={setWaveHsM} min={0} max={5} step={0.1} unit="m" />
          <Select label="Fuel type" value={fuelType} onChange={setFuelType} options={FUEL_TYPES} />
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <div className="border rule rounded-sm bg-ink-raised p-6 mb-6 relative overflow-hidden">
            <motion.div
              animate={loading ? { opacity: [0.3, 0.6, 0.3] } : { opacity: 0 }}
              transition={{ repeat: loading ? Infinity : 0, duration: 1.1 }}
              className="absolute inset-0 bg-brass/5 pointer-events-none"
            />
            <p className="text-xs text-paper/50 mb-2 relative">Predicted fuel consumption</p>
            {result ? (
              <div className="relative">
                <p className="font-display text-4xl mb-1">
                  <AnimatedNumber value={result.fuel_t_per_day} decimals={2} duration={0.5} />
                  <span className="text-lg text-paper/50"> t/day</span>
                </p>
                <p className="font-mono text-xs text-paper/40">
                  range: {result.q10.toFixed(2)} – {result.q90.toFixed(2)} t/day
                </p>
                <div className="mt-3 h-1.5 bg-ink rounded-full relative overflow-hidden">
                  <motion.div
                    className="absolute h-full bg-brass/40 rounded-full"
                    animate={{
                      left: `${(result.q10 / rangeSpan) * 100}%`,
                      width: `${((result.q90 - result.q10) / rangeSpan) * 100}%`,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute h-full w-0.5 bg-brass-bright"
                    animate={{ left: `${(result.fuel_t_per_day / rangeSpan) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-paper/40 text-sm relative">{loading ? "Loading..." : "—"}</p>
            )}
          </div>

          <div className="border rule rounded-sm bg-ink-raised p-6">
            <p className="text-xs text-paper/50 mb-4">What's driving this prediction (SHAP)</p>
            <AnimatePresence mode="wait">
              {result && result.shap_top3.length > 0 ? (
                <motion.div
                  key={result.shap_top3.map(([n]) => n).join(",")}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {result.shap_top3.map(([name, value]) => (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-mono text-paper/70">{name}</span>
                        <span className={`font-mono ${value < 0 ? "text-signal" : "text-alert"}`}>
                          {value > 0 ? "+" : ""}{value.toFixed(4)}
                        </span>
                      </div>
                      <div className="h-2 bg-ink rounded-full relative overflow-hidden">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-paper/20" />
                        <motion.div
                          className={`absolute h-full rounded-full ${value < 0 ? "bg-signal" : "bg-alert"}`}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(Math.abs(value) / maxAbsShap) * 45}%`,
                            left: value < 0 ? `${50 - (Math.abs(value) / maxAbsShap) * 45}%` : "50%",
                          }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-paper/40 pt-2">
                    green = pushes fuel consumption down vs. the physics baseline, rust = pushes it up
                  </p>
                </motion.div>
              ) : (
                <p className="text-paper/40 text-sm">{loading ? "Computing..." : "—"}</p>
              )}
            </AnimatePresence>
          </div>

          {error && <p className="mt-4 text-sm text-alert">{error} — is the local backend running?</p>}
        </motion.div>
      </div>
    </div>
  );
}

function Slider({
  label, value, onChange, min, max, step, unit,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-2">
        <span className="text-paper/60">{label}</span>
        <span className="font-mono text-paper">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brass"
      />
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-xs text-paper/60 mb-2">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-ink-raised border rule rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-brass"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
