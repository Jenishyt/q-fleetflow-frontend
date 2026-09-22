import Link from "next/link";

const benchmarkRows = [
  { algo: "Greedy heuristic", hv: "1,177", feas: "0%", cost: "$142,551" },
  { algo: "Random search", hv: "2,511 ± 79", feas: "80.8%", cost: "$109,018" },
  { algo: "QIEA (ours)", hv: "2,849 ± 91", feas: "92.5%", cost: "$92,944", highlight: true },
  { algo: "NSGA-II", hv: "3,564 ± 54", feas: "83.8%", cost: "$60,244" },
];

export default function OverviewPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <div className="grid md:grid-cols-[1.3fr_1fr] gap-12 items-start">
        <div>
          <p className="font-mono text-xs text-brass-bright mb-3">Quantum-inspired optimization, laptop-scale</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.08] mb-5">
            Fuel prediction and fleet optimization for a decarbonizing shipping industry.
          </h1>
          <p className="text-paper/70 text-lg leading-relaxed max-w-xl">
            A physics-anchored prediction engine and a Q-bit register optimizer plan vessel
            speed, fuel, and capacity against real FuelEU, EU ETS, and IMO CII limits —
            benchmarked honestly against NSGA-II, not just against a strawman.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/optimize"
              className="bg-brass text-ink px-5 py-2.5 rounded-sm font-medium text-sm hover:bg-brass-bright transition-colors"
            >
              Run the optimizer
            </Link>
          </div>
        </div>

        <div className="border rule rounded-sm p-6 bg-ink-raised">
          <p className="font-mono text-[11px] text-paper/50 mb-4">10-seed benchmark, Wilcoxon-tested</p>
          <div className="space-y-4">
            {benchmarkRows.map((r) => (
              <div key={r.algo} className={`pb-4 ${r.algo !== "NSGA-II" ? "border-b rule" : ""}`}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className={`text-sm ${r.highlight ? "text-brass-bright" : "text-paper/80"}`}>{r.algo}</span>
                  <span className="font-mono text-xs text-paper/40">HV {r.hv}</span>
                </div>
                <div className="flex items-baseline gap-4 font-mono text-sm">
                  <span>{r.cost}</span>
                  <span className="text-paper/50 text-xs">{r.feas} feasible</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-20 grid md:grid-cols-3 gap-8 border-t rule pt-10">
        <div>
          <p className="font-mono text-xs text-depth mb-2">Prediction engine</p>
          <p className="text-sm text-paper/70 leading-relaxed">
            Admiralty cubic law prior, corrected by a LightGBM residual on the log-ratio.
            3.33% MAPE, R²=0.996 on held-out voyages, 12.7ms per 100-row batch.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-depth mb-2">Compliance engine</p>
          <p className="text-sm text-paper/70 leading-relaxed">
            FuelEU well-to-wake intensity, EU ETS phase-in cost, IMO CII rating bands.
            Every emission factor is sourced or explicitly flagged as an assumption.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-depth mb-2">Honest benchmarking</p>
          <p className="text-sm text-paper/70 leading-relaxed">
            NSGA-II wins on raw hypervolume (p=0.002). QIEA wins on feasibility rate
            (p=0.002) — repair-first constraint handling trades exploration for legality.
          </p>
        </div>
      </div>
    </div>
  );
}
