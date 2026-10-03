export type Status = "built" | "progress" | "planned";
export const STATUS: Record<Status, { label: string; color: string; blurb: string }> = {
  built: { label: "Built", color: "#6fd08c", blurb: "Working and tested" },
  progress: { label: "In progress", color: "#d2a35c", blurb: "Built but not fully verified, or a known gap" },
  planned: { label: "Planned", color: "#7fb8ff", blurb: "Not built yet" },
};

export interface Sub { title: string; status: Status; text: string }
export interface NodeData {
  id: string; title: string; tag: string; one: string; status: Status;
  col?: number; row?: number; href?: string; endpoint?: string;
  stats?: [string, string][]; subs: Sub[]; blocker?: string;
}
export interface Edge { from: string; to: string }

export const COLS = [
  { n: 1, title: "Inputs", sub: "What goes in" },
  { n: 2, title: "Engines", sub: "Predict & check" },
  { n: 3, title: "Solve", sub: "Decide & prove" },
  { n: 4, title: "Outputs", sub: "What you get" },
];

export const PIPELINE: NodeData[] = [
  { id: "data", col: 1, row: 1, tag: "INPUT", title: "Fuel & voyage data", status: "built",
    one: "What the models learn from: voyages with speed, draft, weather and fuel burned.",
    subs: [
      { title: "Synthetic dataset generator", status: "built", text: "Deterministic and physics-consistent. Self-healing: regenerates its data file if missing (verified)." },
      { title: "Kaggle sanity check", status: "built", text: "Compares real fuel-per-distance with the model's value at design speed. The Kaggle set tested has no speed column and covers fishing/offshore boats, so it can't validate the speed³ law. Documented, not forced." },
      { title: "Real fleet telemetry for training", status: "planned", text: "Needs a commercial-cargo dataset with a speed field, or an AIS-derived feed." },
    ] },
  { id: "config", col: 1, row: 2, tag: "INPUT", title: "Scenario & emission factors", status: "built",
    one: "The rules of the game: routes, fuels, prices and sourced emission factors.",
    subs: [
      { title: "scenario.yaml", status: "built", text: "3 real port pairs, 6 fuels including hydrogen and ammonia (all six selectable on the short feeder), and shore power as a decision variable." },
      { title: "Sensitivity grid & 4 case studies", status: "built", text: "12 carbon-price x alt-fuel-price scenarios plus base, demand-surge, green-push and tight-schedule cases, each solved by QIEA and NSGA-II. See /scenarios." },
      { title: "factors.yaml", status: "built", text: "Every emission factor is either sourced or explicitly flagged as an assumption." },
      { title: "Scenario distances are stylised", status: "progress", text: "The optimizer scenario uses 500 / 800 / 350 nm for Chennai to Colombo / Singapore / Cochin as planning inputs; the map measures about 758 / 1,636 / 1,054 nm. Disclosed in the UI and left unchanged on purpose: realistic distances would strain the 72 h/week schedule budget, so switching means redesigning the scenario and re-running the benchmark." },
    ] },
  { id: "geo", col: 1, row: 3, tag: "INPUT", title: "Ports & sea lanes", status: "built",
    one: "Where ships can go: ports, shipping lanes, chokepoints and zones.",
    subs: [
      { title: "36 reference ports", status: "built", text: "13 from the backend (real coordinates and UN/LOCODEs) merged with 23 more. Works offline." },
      { title: "Sea-lane graph", status: "built", text: "181 nodes, 215 edges, hand-authored. Every edge is machine-checked against Natural Earth land data: 0 crossings. An approximation, not for navigation." },
      { title: "Advisory & emission-control zones", status: "progress", text: "Indicative hand-drawn shapes (Red Sea, Gulf of Aden, Hormuz, Malacca, Med and North Sea ECAs). Not live, not official boundaries; authoritative GeoJSON still to swap in." },
    ] },

  { id: "pred", col: 2, row: 1, tag: "Q-PHYS", title: "Prediction engine", status: "built", href: "/predict", endpoint: "POST /predict",
    one: "Predicts how much fuel a ship burns at a given speed, draft and weather.",
    stats: [["3.27%", "MAPE (10 splits)"], ["0.996", "R²"], ["12.7 ms", "per 100 rows"]],
    subs: [
      { title: "Physics prior (admiralty law)", status: "built", text: "Fuel grows with speed cubed. A physics floor keeps predictions sensible even outside the training data." },
      { title: "LightGBM residual correction", status: "built", text: "Learns the log-ratio between reality and the physics prior: F̂ = F_phys · exp(r)." },
      { title: "Quantum-inspired model tuning", status: "built", text: "The same Q-bit register and rotation gates as the fleet optimizer choose which features the residual model sees and its five hyper-parameters (14 genes). Honest result: lowest mean error, but not significantly better than hand-set or random-search tuning; the physics prior is what matters (p = 0.002 vs plain LightGBM)." },
      { title: "SHAP explanations", status: "built", text: "Top-3 drivers for every prediction (exact TreeSHAP)." },
      { title: "Uncertainty band (q10–q90)", status: "built", text: "Measured coverage is 73.4%, slightly under the 75–90% target. Disclosed, not hidden." },
    ] },
  { id: "comp", col: 2, row: 2, tag: "FVRC", title: "Compliance engine", status: "built", endpoint: "GET /plan/{run}/{plan}/ledger",
    one: "Checks every plan against FuelEU, EU ETS and IMO CII rules and prices the carbon.",
    stats: [["27", "automated tests (backend)"]],
    subs: [
      { title: "FuelEU Maritime intensity", status: "built", text: "Well-to-wake gCO₂e/MJ against the limit." },
      { title: "EU ETS cost", status: "built", text: "Phase-in schedule applied to covered emissions." },
      { title: "IMO CII rating bands", status: "built", text: "Carbon-intensity ratings per plan." },
      { title: "LNG-trap finding", status: "built", text: "Methane slip lifts LNG to 99.9 gCO₂e/MJ, above the 91.16 VLSFO baseline it replaces. Proven by an automated test." },
      { title: "Shore-power-trap finding", status: "built", text: "On a coal-heavy grid (illustrative, unverified assumption), shore power is worse on cost and emissions than the ship's own generator. Tested." },
    ] },
  { id: "route", col: 2, row: 3, tag: "MAP", title: "Route & voyage planner", status: "progress", href: "/map",
    one: "Pick two ports and get a realistic sea route with ETA, fuel, CO₂ and cost.",
    subs: [
      { title: "Sea-lane routing", status: "built", text: "Shortest path over the validated lane graph, computed instantly in the browser (works offline). Sanity-checked against rough reference distances." },
      { title: "Voyage estimates", status: "progress", text: "Distance, ETA, fuel (live /predict, physics fallback offline), CO₂, fuel cost and indicative EU ETS cost. Feature-complete; awaiting visual QA in a real browser." },
      { title: "Compare & Suez-vs-Cape", status: "progress", text: "Pin up to 4 routes and see the best on each metric." },
      { title: "Replay, layers, share links", status: "progress", text: "Voyage replay (a simulation, not AIS), satellite/ocean/dark base maps, seamarks, radar, shareable URLs." },
    ] },

  { id: "opt", col: 3, row: 1, tag: "Q-SOLVE", title: "QIEA optimizer", status: "built", href: "/optimize", endpoint: "POST /optimize",
    one: "Searches 144 vessel/fuel/speed/shore-power choices per route for the best cost, emissions and delay trade-offs.",
    stats: [["144", "alleles"], ["~5–9 s", "per run"], ["10/10", "toy optimum"]],
    subs: [
      { title: "Q-bit register & rotation gates", status: "built", text: "Each gene holds a probability distribution over choices; gates nudge it toward better ones every generation." },
      { title: "Repair-first constraints", status: "built", text: "Invalid plans (unavailable fuel, unmet demand) are fixed before scoring, not just penalised. In the latest benchmark QIEA reaches 90.1% feasibility vs random search's 73.5%, but NSGA-II reaches 97.5%." },
      { title: "3-objective fitness", status: "built", text: "Cost, GHG intensity and schedule risk (delay hours over the weekly window, which are non-zero in the base scenario and large in the tight-schedule case), including the hotel-load (shore power vs onboard) calculation. Fuel tonnes are reported in every ledger." },
      { title: "Pareto archive", status: "built", text: "Keeps every non-dominated plan found." },
      { title: "Tuning vs NSGA-II", status: "planned", text: "NSGA-II scores about 2x QIEA's hypervolume, converges faster and is more often compliant. Closing that gap hasn't been attempted." },
    ] },
  { id: "bench", col: 3, row: 2, tag: "PROOF", title: "Benchmark suite", status: "built", href: "/compare",
    one: "Tests QIEA honestly against four rivals, including where it loses.",
    subs: [
      { title: "4 baselines + Wilcoxon protocol", status: "built", text: "Greedy, random, weighted GA and NSGA-II on the same encoding and budget, 10 seeds." },
      { title: "Convergence & scalability", status: "built", text: "Current results. By generation 150, NSGA-II is at 89.1% of its 400-generation ceiling vs QIEA's 68.0%. Both scale roughly linearly (3–12 routes), NSGA-II about 15–17% faster." },
      { title: "Prediction-accuracy benchmark", status: "built", text: "QIEA-tuned physics+GBM vs hand-set, random-search-tuned, plain LightGBM, XGBoost, linear regression and physics-only, over 10 voyage-grouped splits." },
      { title: "10-seed table (current encoding)", status: "built", text: "Re-run on 24 genes x 144 alleles after the scenario change: mean hypervolume NSGA-II 73.8B, weighted GA 45.1B (single point), QIEA 34.9B, random 30.4B; all Wilcoxon p < 0.01. NSGA-II also leads on cost and feasibility." },
    ] },

  { id: "pareto", col: 4, row: 1, tag: "OUTPUT", title: "Pareto explorer", status: "built", href: "/optimize",
    one: "Browse the best trade-offs, filter them and compare two plans side by side.",
    subs: [
      { title: "3D Pareto plot", status: "built", text: "Cost, GHG and schedule risk in one interactive view." },
      { title: "Filters & A/B plan compare", status: "built", text: "Narrow to compliant plans and compare any two." },
      { title: "Share link", status: "built", text: "Re-open any optimizer run by its link." },
    ] },
  { id: "memo", col: 4, row: 2, tag: "OUTPUT", title: "Decision memo (PDF)", status: "built", endpoint: "GET /plan/{run}/{plan}/memo.pdf",
    one: "A one-page PDF for any chosen plan.",
    subs: [{ title: "One-page memo", status: "built", text: "Generated on demand for the selected plan." }] },
  { id: "rollup", col: 4, row: 3, tag: "OUTPUT", title: "Unified JSON report", status: "planned",
    one: "One export combining prediction, plan, compliance and route into a single stakeholder report.",
    blocker: "No external blocker. It simply isn't built yet; only the per-plan PDF exists.",
    subs: [] },
];

export const EDGES: Edge[] = [
  { from: "data", to: "pred" }, { from: "config", to: "comp" }, { from: "geo", to: "route" },
  { from: "pred", to: "opt" }, { from: "comp", to: "opt" },
  { from: "opt", to: "pareto" }, { from: "opt", to: "memo" }, { from: "opt", to: "bench" },
  { from: "pareto", to: "rollup" }, { from: "memo", to: "rollup" }, { from: "route", to: "rollup" },
];

export const PLATFORM: NodeData[] = [
  { id: "web", tag: "APP", title: "Web app (Next.js)", status: "built",
    one: "The interface judges and users touch.",
    subs: [
      { title: "10+ pages", status: "built", text: "Overview, Predict, Optimize, Explorer, Compare, Map, Ports, Fleet, Roadmap and this Solution page." },
      { title: "Fleet registry", status: "built", text: "Register vessels; specs derived from the physics constants." },
      { title: "Command palette & welcome popup", status: "built", text: "Ctrl/⌘+K to jump anywhere; first-visit popup with one-click backend setup or frontend-only mode." },
    ] },
  { id: "api", tag: "API", title: "Backend API (FastAPI)", status: "built", endpoint: "10 endpoints",
    one: "Serves predictions, optimizer runs, ledgers, PDFs and reference data.",
    stats: [["27", "tests passing"]],
    subs: [
      { title: "Prediction, optimize, ledger, memo", status: "built", text: "/predict, /optimize, /run/{id}, plan ledger and memo.pdf." },
      { title: "Reference data", status: "built", text: "/ports, /fleet, /routes, /health." },
    ] },
  { id: "deploy", tag: "DELIVERY", title: "Deployment", status: "progress",
    one: "How people can actually run it.",
    blocker: "Public backend hosting is blocked: Render ran out of memory, Hugging Face Docker Spaces need a paid plan, Cloud Run/Oracle need a credit card.",
    subs: [
      { title: "Frontend on Vercel", status: "built", text: "Live and working." },
      { title: "One-click local backend", status: "built", text: "setup_and_run.bat / .sh; the site detects it automatically." },
      { title: "Public backend hosting", status: "planned", text: "Needs a host with enough RAM that doesn't require a card." },
    ] },
];

export const HORIZON: NodeData[] = [
  { id: "h-nav", tag: "NEXT", title: "Vessel navigation cockpit", status: "planned", subs: [],
    one: "Live heading, speed-over-ground and ETA per vessel.",
    blocker: "Needs a real AIS/telemetry feed. We won't simulate fake ship positions." },
  { id: "h-land", tag: "NEXT", title: "Land & multi-modal logistics", status: "planned", subs: [],
    one: "EV and hydrogen truck legs alongside sea legs for door-to-door carbon accounting.",
    blocker: "Needs real road-freight cost and emissions data." },
  { id: "h-risk", tag: "NEXT", title: "Live risk intelligence", status: "planned", subs: [],
    one: "Geopolitical, piracy and weather risk scoring per route.",
    blocker: "Static indicative zones already ship on the map. Live scoring needs a licensed threat-intel feed." },
  { id: "h-sat", tag: "NEXT", title: "Live satellite & sea-state", status: "planned", subs: [],
    one: "Live sea-state and vessel-position imagery on the route map.",
    blocker: "Satellite basemap, seamarks and radar exist. Live imagery needs a paid imagery or AIS API." },
];
