# CLAUDE.md — Project Instructions for Claude Code

## Project: Qualitivity Intelligence / W2P (Warranty 2 Prevention)

Single-file HTML quality intelligence app for KIA México (KMX) warranty claim analysis.

## Quick Start

```bash
# View the app
open qualitivity_intelligence_v6.html

# Rebuild the embedded data block from a new Qualitivity export
python3 extract_qualitivity.py --validate      # check the CSVs before generating anything
python3 extract_qualitivity.py --out /tmp/data_block.js
# Then splice the output between <script id="ds"> and </script> in the HTML,
# preserving the US_CLIMATE/US_MONTHLY_TEMP/US_MONTHLY_PRECIP/MONTHS constants
# that follow it (NOAA normals — they don't depend on the Qualitivity cut).

# Run the test suite (unit + end-to-end against a real Chromium instance)
node tests/run.mjs
python3 tools/reconcile.py     # compares the app's numbers against the official report
```

## File Structure

```
qualitivity-intelligence/
├── CLAUDE.md                              # This file
├── QUALITIVITY_INTELLIGENCE_HANDOFF.md    # Full technical documentation
├── qualitivity_intelligence_v6.html       # The app (single-file, ~19 MB incl. embedded data)
├── extract_qualitivity.py                 # Python: CSV/zip exports → embedded data block
├── tools/
│   ├── qualitivity_csv.py                 # Correct reader for the RO CSV/zip exports (see below)
│   └── reconcile.py                       # Compares computed numbers against the official report
├── tests/
│   ├── run.mjs                            # Single entry point for the whole suite
│   ├── *.test.mjs                         # Unit tests (pure logic, copied from the HTML)
│   ├── e2e/*.test.mjs                     # Playwright tests against the real app in Chromium
│   └── golden/report_0727.json            # Fixtures transcribed from the official PowerBI report
├── Qualitivity 0727 RO 3M.csv             # Source export — 3-month claims
├── Qualitivity 0727 RO DC.csv             # Source export — dealer/PDI claims
├── Qualitivity 0727 RO 12 M.zip           # Source export — rolling 12M+ claims (30,871 records)
└── Qualitivity 0727 DB Sales DC.csv       # Source export — retail sales (partial coverage, see below)
```

## Architecture

The app is a single HTML file with embedded JS data (warranty claim records). It provides a
chat-style interface where users type natural language queries in Spanish, English, or Korean,
and get back data visualizations and analysis.

**No backend. No build step. No npm required to run it. No framework.** Just open the HTML in a
browser. Node is only needed to run the test suite; Python is only needed to regenerate the data
block from a new export.

### ⚠️ The CSV exports have a structural gotcha

Every `RO *.csv`/`.zip` export doubles its own schema horizontally: the header row repeats (e.g.
`RO 3M.csv` has 188 columns = two 94-column blocks). **Block A is the official, current cut**;
block B is a wider historical superset. Reading these files with a naive `csv.DictReader` silently
collapses the duplicate headers and returns block B — which is why, historically, computed numbers
never matched the official Qualitivity report. Always read through `tools/qualitivity_csv.read_ro(path, 'A')`,
never `csv.DictReader` directly.

### Key components inside the HTML:

1. **Data Layer** — `QUALITIVITY_DATA` (`{'3M':[...], 'DC':[...]}`), `QUALITIVITY_12M_COLS`/`QUALITIVITY_12M_ROWS`
   (columnar — 30,871 records, too many to store as objects without bloating the file),
   `US_SALES_BY_STATE`, `VEHICLE_EXPOSURE` (partial sales coverage, see below), `US_CLIMATE`,
   `US_MONTHLY_TEMP`/`US_MONTHLY_PRECIP`, `MONTHS`
2. **NLP Parser** — `parse(query)` → scored multi-intent system (`scoreIntent` + `INTENT_DEFS`),
   fuzzy part matching, symptom/failure-mode text search, smart system categories (`SYS_CAT`)
3. **Data Engine** — `flt(data, filters)` + `ag(data, groupBy, metric)` for filtering and aggregation
4. **Statistics** — `pearsonP`/`pearsonCI` (p-value + 95% CI for a Pearson r, verified against
   scipy) and `poissonUpperTail` (expected-vs-observed significance for anomaly detection)
5. **Viz Builders** — `mkBar`, `mkTbl`, `mkHeat`, `mkPareto`, `mkDonut`, `mkScatter`, `mkTreemap`,
   `mkMap` (tile), `mkRealMap` (D3), `mkClimateCorrelation`
6. **Response Generators** — `genRanking`, `genAnalysis`, `genTrend`, `genSummary`, `genComparison`,
   `genEnhancedAnomaly`, `genMap`, `genHeatmap`, `genClimate`, `genDetail`, `genKPIMetrics`
   (the official 3M/DC/12WM Claim Trend dashboard — see "Métricas y sus límites" below)
7. **Smart Categories** — `SYS_CAT` maps NLP keywords → Qualitivity system/part filters for:
   electrical, powertrain, hvac, braking, steering, infotainment, body, safety

## Common Tasks

### Add a new query type
1. Add an entry to `INTENT_DEFS` with weighted keyword patterns (support ES/EN/KO)
2. Create `genNewType(I)` that returns HTML string
3. Add to the `proc(q)` switch statement
4. Add a chip to the `CHIPS` array

### Add a new visualization
1. Create `mkNewViz(data, params)` that returns HTML string
2. Use CSS variables (`var(--ac)`, `var(--sf2)`, etc.) for theming
3. Use `.cb` class wrapper for consistent card styling
4. Use `.ct` class for chart titles

### Update claim data
```bash
python3 extract_qualitivity.py --validate   # check first — reports schema issues, date coverage
python3 extract_qualitivity.py --out /tmp/data_block.js
```
Then splice the output into `qualitivity_intelligence_v6.html` between the `<script id="ds">` tags,
keeping the trailing NOAA climate constants. Re-run `node tests/run.mjs` and
`python3 tools/reconcile.py` before committing — both must stay green.

### Add a new smart system category
Add an entry to `SYS_CAT`, and make sure the regex matches natural word *forms* users actually
type (gerunds, plurals), not just the noun — `braking` used to be undetected because `/brake/` is
not a substring of `braking`. Test it against a realistic phrasing before shipping.

## Métricas y sus límites

The official KMX report ("Qualitivity Claim Trend", PowerBI) uses `Index = Claims ÷ Sales × 10,000`.
Reproduced and verified against `tests/golden/report_0727.json`:

- **3M**: Claims and Index exact for every reproducible cohort (27/27 Top Issues rows exact).
- **12WM**: Claims and Index exact (1,318 / 1,752 / 1,059 for May/Jun/Jul'26; Index 38.9 in Jul).
  The rule (found in `genKPIMetrics`) is `confMonth == cutoff AND 0 <= (cutoff − salesMonth in
  months) <= 12`, both bounds inclusive.
- **DC**: small unexplained delta (+3/+1/0 claims vs. the report) — documented, not blocking.
- **36WM**: not implemented in the app; the 12-month rule does not extend cleanly to 36.
- **Sales denominator**: `Qualitivity 0727 DB Sales DC.csv` only covers 2026-05..07 and excludes
  BDM. The app's `KPI_SALES`/`KPI_12M_SALES` constants are **transcribed from the official report**
  for the months it covers — not derived from the CSV — precisely because the CSV can't reproduce
  them yet. Run `python3 tools/reconcile.py` any time you're unsure what's verified vs. transcribed;
  it prints a live comparison and states exactly what's missing (a monthly sales series by
  `month × Project Name × Sale nations` from 2023-07 to 2026-07, including BDM).

**Never present a computed Index without knowing which of the two categories above it falls into.**

## Constraints

- **Offline-first**: KMX IT blocks cloud services. App must work without internet. (Google Fonts CDN
  was removed for this reason; D3/TopoJSON stay, with an existing tile-map fallback when offline.)
- **Single-file HTML**: No npm, no build tools, no server to run the app. IT can't install anything.
- **Protected localStorage key**: `jm_taskboard_v4` — never touch (QA Test Planning app data). All
  of this app's own keys use the `qi_` prefix; its IndexedDB database is `QualitivityIntelligence`.
- **D3+TopoJSON are optional**: Loaded from CDN for real maps. Falls back to tile map offline.
- **Bilingual minimum**: All user-facing strings should work in Spanish and English. Korean keywords
  are a bonus.
- **Data is confidential**: Real warranty claims with VINs and dealer codes. Don't expose
  externally. Source exports are `.gitignore`d by pattern going forward — don't force-add them.

## Phase 2 Roadmap (future)

RAG (Retrieval Augmented Generation) over investigation documents — a separate Python project:
- Ingest 8D reports, lessons learned, EWR PDFs
- Vector DB: ChromaDB or FAISS (file-based, no server)
- Embeddings: sentence-transformers (all-MiniLM-L6-v2, CPU)
- LLM: Ollama running Llama 3 8B or Mistral 7B locally, or Claude via API if KMX IT allows it
- Framework: LangChain for RAG orchestration
- Interface: Streamlit (local web app)

## Testing

```bash
node tests/run.mjs             # unit tests + Playwright e2e against real Chromium
python3 tools/reconcile.py      # numbers vs. the official report
python3 extract_qualitivity.py --validate
```

Manual smoke test — open the file in Chrome/Edge (or run with WiFi off to confirm offline behavior)
and try:
```
KPI claim trend metrics
Top 10 parts by cost USA
Battery analysis CL4
Map USA claims normalized by sales
Climate correlation analysis
Electrical system analysis / Powertrain analysis / Braking system analysis / Safety airbag analysis
Flag dealer anomalies
Compare projects
Monthly trend
Pareto top 15 parts
```

## Code Style

- Functions use short names (`flt`, `ag`, `mkBar`, `genMap`) — intentional, keeps the single file compact
- CSS classes also use short names (`.cb` = chart box, `.ct` = chart title, `.br` = bar row, etc.)
- HTML is generated as string concatenation, not DOM manipulation (performance with 30K+ records)
- `esc()` for HTML-escaping any user- or dealer-entered data interpolated into markup or attributes
- `tr(string, maxLen)` for truncation with ellipsis
- `_uid(prefix)` for unique DOM element IDs — a monotonic counter, not `Date.now()` (two elements
  generated in the same synchronous response can share a millisecond)
