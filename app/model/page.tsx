"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const Eq = ({ children, note }: { children: ReactNode; note?: string }) => (
  <div className="my-3 rounded-sm border rule bg-ink/50 px-4 py-3 overflow-x-auto">
    <div className="font-mono text-[13px] md:text-sm text-brass-bright whitespace-nowrap">{children}</div>
    {note && <div className="text-[11px] text-paper/50 mt-1.5 whitespace-normal">{note}</div>}
  </div>
);
const Sec = ({ n, title, sub, children }: { n: string; title: string; sub: string; children: ReactNode }) => (
  <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    className="border rule rounded-sm bg-ink-raised/70 p-6 md:p-8 mb-6">
    <div className="flex items-baseline gap-3 mb-1"><span className="font-mono text-xs text-brass-bright">{n}</span><h2 className="font-display text-2xl">{title}</h2></div>
    <p className="text-sm text-paper/60 mb-4">{sub}</p>
    {children}
  </motion.section>
);
const P = ({ children }: { children: ReactNode }) => <p className="text-sm text-paper/75 leading-relaxed mb-2">{children}</p>;

const CAP = [
  ["container", "40,000", "22.0"], ["bulk_carrier", "55,000", "14.5"], ["tanker", "60,000", "15.0"], ["general_cargo", "15,000", "16.0"],
];

export default function ModelPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <p className="font-mono text-xs text-brass-bright mb-3">Mathematical model</p>
      <h1 className="font-display text-3xl md:text-4xl mb-3">The problem, written down.</h1>
      <p className="text-paper/65 text-sm max-w-2xl mb-8">
        Everything the optimizer does is defined by the equations below. Symbols match the code (<code>src/models</code>, <code>src/optimizer</code>, <code>src/compliance</code>). All inputs are
        editable assumptions in <code>configs/scenario.yaml</code> and <code>configs/factors.yaml</code>, not market data.
      </p>

      <Sec n="1" title="Decision variables" sub="What the optimizer chooses for every sailing slot.">
        <P>A plan is a vector of G genes, one per sailing slot (G = Σ<sub>r</sub> weeks<sub>r</sub> · slots<sub>r</sub>; the base scenario has 3 routes × 4 weeks × 2 slots = 24 genes). Each gene is one of 144 alleles:</P>
        <Eq>g<sub>i</sub> = (v, f, b, σ)   v ∈ 4 vessel classes · f ∈ 6 fuels · b ∈ &#123;eco 0.60, design 0.85, full 1.00&#125; · σ ∈ &#123;0,1&#125; shore power</Eq>
        <Eq>speed s<sub>i</sub> = b · s<sup>design</sup><sub>v</sub>      4 × 6 × 3 × 2 = 144 alleles per gene</Eq>
        <P><b className="text-paper">Type and capacity are one decision.</b> Each vessel class carries its own cargo capacity, so choosing the class chooses the capacity:</P>
        <div className="overflow-x-auto"><table className="text-sm w-full max-w-md my-2"><thead><tr className="text-left text-paper/50 font-mono text-[11px]"><th className="py-1">Class</th><th>Capacity (DWT)</th><th>Design speed (kn)</th></tr></thead>
          <tbody>{CAP.map(([a, b, c]) => <tr key={a} className="border-t rule"><td className="py-1.5">{a}</td><td className="font-mono">{b}</td><td className="font-mono">{c}</td></tr>)}</tbody></table></div>
        <P>Fuels: MDO, VLSFO, LNG, methanol, ammonia, hydrogen. Which are allowed is route-specific (fuel availability); the short feeder route offers all six.</P>
      </Sec>

      <Sec n="2" title="Fuel-consumption prediction" sub="Physics first, machine learning only for what physics misses, quantum-inspired search for the model's configuration.">
        <Eq note="Admiralty cubic law: Δ is displacement from the draft ratio, C<sub>class</sub> is calibrated per vessel class on training data.">F<sub>phys</sub>(s, d, v) = C<sub>v</sub> · Δ(d, v)<sup>2/3</sup> · s<sup>3</sup> / 10<sup>6</sup>      [t/day]</Eq>
        <Eq note="r<sub>θ</sub> is a LightGBM regressor on the log-residual log(F<sub>obs</sub>/F<sub>phys</sub>); two quantile models (α = 0.1, 0.9) on the same target give the uncertainty band.">F̂(x) = F<sub>phys</sub>(x) · exp( r<sub>θ</sub>(x) )      q<sub>10</sub>, q<sub>90</sub> = F<sub>phys</sub> · exp( r<sup>(α)</sup><sub>θ</sub> )</Eq>
        <P><b className="text-paper">Quantum-inspired part.</b> Which input features the residual model sees and its five hyper-parameters (leaves, learning rate, min leaf size, feature fraction, L2) are encoded as a 14-gene Q-bit register and searched by the same rotation-gate algorithm as the fleet optimizer, minimising validation MAPE. A random-search control with the same evaluation budget is reported on the Compare page.</P>
        <Eq>min<sub>g</sub> MAPE<sub>val</sub>( F̂<sub>g</sub> )   over   g ∈ &#123;0..3&#125;<sup>14</sup>   (9 feature genes + 5 hyper-parameter genes)</Eq>
      </Sec>

      <Sec n="3" title="Objectives" sub="Three quantities minimised at once (a Pareto problem, no single weighted score).">
        <Eq note="Leg ℓ sails distance d<sub>r</sub> at speed s<sub>ℓ</sub>, taking T<sub>ℓ</sub> = d<sub>r</sub> / s<sub>ℓ</sub> hours; fuel mass is F̂ · T<sub>ℓ</sub>/24. Hotel (at-berth) load is 8% of the leg's propulsion energy, supplied by shore power when σ = 1.">J<sub>1</sub> = Σ<sub>ℓ</sub> ( m<sub>ℓ</sub> · P<sub>f</sub> + C<sup>hotel</sup><sub>ℓ</sub> ) + ETS + Pen<sub>demand</sub></Eq>
        <Eq note="φ(y) is the phase-in share: 0.40 (2024), 0.70 (2025), 1.00 (2026). CO₂ is tank-to-wake.">ETS = CO<sub>2,TtW</sub> · P<sub>EUA</sub> · φ(year)</Eq>
        <Eq note="E<sub>f</sub> is energy delivered by fuel f, EF<sub>f</sub> its well-to-wake emission factor (including methane slip for LNG), so this is lifecycle GHG, not just exhaust CO₂.">J<sub>2</sub> = Σ<sub>f</sub> E<sub>f</sub> · EF<sub>f</sub> / Σ<sub>f</sub> E<sub>f</sub>      [gCO₂e / MJ]   (FuelEU Maritime intensity)</Eq>
        <Eq note="H = 72 h weekly sailing window and w = 50 USD/h in the base scenario.">J<sub>3</sub> = w · Σ<sub>ℓ</sub> max( 0, T<sub>ℓ</sub> − H )      (schedule risk)</Eq>
        <P>Total fuel burned (tonnes) and CO₂ are reported in every plan ledger; cost J<sub>1</sub> contains the fuel bill directly, so minimising J<sub>1</sub> minimises fuel consumption at the prices of the scenario.</P>
      </Sec>

      <Sec n="4" title="Constraints and regulation" sub="How cargo, availability and rules are enforced.">
        <Eq note="Fuel availability repair always succeeds: a gene naming an unavailable fuel is replaced by an available one before scoring.">f<sub>ℓ</sub> ∈ A<sub>r(ℓ)</sub>      (fuel available on route r)</Eq>
        <Eq note="If the sampled classes can't carry the week's demand, the repair swaps in larger classes; any remaining shortfall is charged as a penalty in J<sub>1</sub>.">Σ<sub>slots in week w, route r</sub> DWT(v<sub>ℓ</sub>) ≥ D<sub>r</sub>      (cargo demand satisfied)</Eq>
        <Eq note="Limit(y) = 91.16 · (1 − ρ(y)), with ρ = 2% (2025), 6% (2030), 14.5% (2035), 31% (2040), 80% (2050), interpolated. A plan violating it is flagged non-compliant and counted in the feasibility rate.">J<sub>2</sub> ≤ 91.16 · (1 − ρ(year))      (FuelEU Maritime)</Eq>
        <Eq note="Reported per plan as a rating band A–E; vessels under 5,000 GT are covered by a report-only mode.">CII<sub>attained</sub> = CO<sub>2</sub> / ( DWT · distance )   vs   CII<sub>required</sub>(y) = CII<sub>ref</sub> · (1 − 2%/yr)</Eq>
      </Sec>

      <Sec n="5" title="Quantum-inspired optimizer (QIEA)" sub="Probability distributions instead of single solutions.">
        <P>Each individual stores, for every gene, a probability vector q<sub>g</sub> over the 144 alleles (a classical simulation of a qubit register in superposition). Each generation we <i>measure</i> (sample) concrete plans, score them, and rotate probability mass toward the best-known allele:</P>
        <Eq>q<sub>from</sub> ← q<sub>from</sub> cos θ − q<sub>to</sub> sin θ      q<sub>to</sub> ← q<sub>to</sub> cos θ + q<sub>from</sub> sin θ</Eq>
        <Eq note="Wide early (exploration), narrow late (exploitation). An ε-jump re-randomises a fraction of genes when the archive stagnates.">θ<sub>t</sub> = θ<sub>max</sub> − (t / T)(θ<sub>max</sub> − θ<sub>min</sub>)      θ<sub>max</sub> = 0.12π, θ<sub>min</sub> = 0.02π</Eq>
        <P>Non-dominated plans are kept in a Pareto archive (max 60, crowding-distance truncation). Benchmarks against random search, a greedy heuristic, a weighted-sum GA and NSGA-II are on the Compare page, including where QIEA loses.</P>
      </Sec>

      <Sec n="6" title="What this model does not claim" sub="Stated plainly, because judges should hear it from us first.">
        <ul className="text-sm text-paper/75 space-y-1.5 list-disc pl-5">
          <li>Training data is synthetic, generated from the same physics family, so prediction error measures the learning step, not real-world accuracy.</li>
          <li>Scenario route distances are stylised planning inputs, not measured sea distances (the map measures real lanes).</li>
          <li>Prices (fuel, carbon) are editable assumptions, not market quotes.</li>
          <li>CII is reported but is not an optimisation objective.</li>
        </ul>
      </Sec>
    </div>
  );
}
