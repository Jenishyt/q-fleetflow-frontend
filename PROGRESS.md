# Q-FORGE — Progress tracker

_Last updated: 2 Oct 2026. Source of truth for what is done, what is verified, and what remains._
Legend: ✅ done & verified · 🟡 done, not yet verified in a browser/with live data · ⬜ not started · ⛔ blocked (blocker named)

## A. Backend (q-fleetflow) — unchanged this session
| Status | Item |
|---|---|
| ✅ | Physics-anchored fuel model + LightGBM residual (MAPE 3.33 %, R² 0.996, 12.7 ms / 100 rows), SHAP top-3, q10/q90 (coverage 73.4 %, disclosed) |
| ✅ | QIEA optimizer, 144-allele encoding (vessel × fuel × speed × shore power), repair-first constraints |
| ✅ | Compliance engine: FuelEU, EU ETS, IMO CII; LNG-trap and shore-power-trap findings proven in tests |
| ✅ | API: /predict /optimize /run /plan ledger + memo.pdf /ports /fleet /routes /health; 27 pytest tests passing |
| ✅ | Convergence + scalability benchmarks (current) |
| ⬜ | **Re-run the 10-seed benchmark on the 144-allele encoding** (`benchmark_table.csv`, `/compare`, home page numbers are STALE — 60-allele era) |
| ⬜ | QIEA tuning to close the gap with NSGA-II (hypervolume + convergence speed) |
| ⬜ | Unified JSON report rollup (only per-plan PDF exists) |
| ⛔ | Public backend hosting — Render OOM, HF Spaces paid, Cloud Run/Oracle need a card. Runs locally for demos |
| ⛔ | Real fleet telemetry — Kaggle set tested has no speed field and is the wrong domain |

## B. Frontend (q-fleetflow-web)
### Before this session ✅
Overview, Predict, Optimize, Pareto explorer (+A/B compare, share link, PDF memo), Compare, Ports, Fleet, Roadmap, 404, boot preloader, toasts, celebration, skeletons, tilt cards, animated numbers.

### This session
| Status | Item |
|---|---|
| ✅ | **Sea-lane routing engine** — 181-node / 215-edge hand-authored lane graph; every edge machine-checked against Natural Earth 50 m land (**0 land crossings**, `npm run lanes:validate`); Dijkstra routing in the browser (instant, works offline) |
| ✅ | Route distances sanity-checked vs rough reference values: within ~4–13 % on long-haul pairs (`npm run routes:check`) |
| ✅ | Antimeridian-safe routes (Shanghai→LA draws continuously across the Pacific), ports rendered in 3 world copies |
| 🟡 | **Map studio** (`components/map/*`): port search/select with keyboard nav, click-to-select on map, swap, quick routes (the 3 scenario routes + presets), Suez/Red-Sea avoidance, vessel/fuel/speed → distance, ETA, fuel (live `/predict`, physics fallback offline), CO₂ (IMO Cf), fuel cost, indicative EU-ETS cost |
| 🟡 | Compare tab: pin up to 4 routes, best-per-metric highlighted, one-click **Suez vs Cape** comparison |
| 🟡 | Chokepoint detection (Suez, Bab-el-Mandeb, Hormuz, Malacca, Singapore, Gibraltar, Dover, Taiwan, Cape) + indicative advisory zones & SOx ECAs (click for notes) |
| 🟡 | Planned-voyage replay (play/scrub/speed) — clearly labelled a simulation, **not** AIS |
| 🟡 | Base maps: Dark, Ocean/bathymetry, Satellite, Light (no key). Overlays: OpenSeaMap seamarks, RainViewer radar (no key). Optional keys: MapTiler satellite HD, OpenWeather wind/cloud/pressure/temp |
| 🟡 | Shareable URLs (`/map?from=INBOM&to=NLRTM&speed=14&fuel=MDO&class=tanker&nosuez=1`), copy route as GeoJSON, nearest-port probe on open-water click |
| 🟡 | Scenario-vs-lane reconciliation note (see finding 1 below) |
| 🟡 | Site-wide: aurora + grid background, scroll-progress line, cursor-spotlight cards, headline shine, new page transition, home-page map showcase, Ctrl/⌘ + K command palette (pages, routes, ports) |
| ✅ | `lib/api.ts` reconstructed (it was missing from the zip) |
| ✅ | `npx tsc` clean, `next build` passes, new files lint-clean |
| ⬜ | Visual QA in a real browser at desktop + phone widths (no headless browser available in the build sandbox) |
| ⬜ | Confirm tile hosts load on your network (Esri, CARTO, OpenSeaMap, RainViewer) |
| ⬜ | Replace indicative zone polygons with authoritative GeoJSON (IMO/EMSA ECAs, UKMTO/ReCAAP areas) |
| ⬜ | Replace rough distance references with a licensed port-to-port table before quoting any distance externally |
| ⬜ | Update `/compare` + home benchmark numbers after the backend re-run |
| ⛔ | Live vessel positions, live threat scoring, live sea-state — need AIS / licensed feeds (kept on `/roadmap`, unfaked) |

## C. Findings worth keeping (honesty log)
1. **Scenario distances don't match the sea.** `scenario.yaml` uses 500 / 800 / 350 nm for Chennai→Colombo / Singapore / Cochin. The deep-draft lane graph measures ≈ 758 / 1,636 / 1,054 nm (great-circle Chennai–Colombo alone is ≈ 349 nm; large ships can't use the shallow Palk Strait, so they round Sri Lanka). Either document the YAML values as coastal-feeder assumptions or update them — it changes every cost number.
2. Lane geometry is an approximation for planning/visualisation, **not navigation**.
3. Advisory/ECA zones are indicative hand-drawn shapes, **not live** and not official boundaries.
4. Earlier findings (LNG trap, shore-power trap, NSGA-II beats QIEA on HV + speed, Kaggle domain mismatch) unchanged.

## D. Decisions to confirm
- The handoff said the command palette was *explicitly skipped*; it was added now because you asked for "all other features". To remove: delete `<CommandPalette />` in `app/layout.tsx` and the Search button in `components/Nav.tsx`.
