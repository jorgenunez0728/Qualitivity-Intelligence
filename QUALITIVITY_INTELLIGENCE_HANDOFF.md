# Qualitivity Intelligence — Claude Code Handoff

## Project Overview

**Qualitivity Intelligence** is a single-file HTML application that provides conversational natural language query access to KIA México (KMX) warranty claim data from their Qualitivity system. It runs 100% in the browser with zero backend dependencies.

**Owner:** Jorge Alberto Nuñez de León — Laboratory Leader, Emissions/QA, KMX Pesquería N.L.
**Purpose:** Demonstrate AI-powered quality intelligence to KMX leadership as part of a promotion to QA Quality Improvement Manager.

---

## Current State (v6, corte de datos 0727)

> Nota: esta sección quedó desactualizada tras la consolidación de ramas y la
> migración del origen de datos de un .xlsm a los export CSV/zip 0727. Ver
> CLAUDE.md para la referencia operativa vigente (estructura de archivos,
> arquitectura, y la sección "Métricas y sus límites"); el resto de este
> documento conserva el contexto histórico/narrativo del proyecto.

### File
- `qualitivity_intelligence_v6.html` — single self-contained HTML file (~19 MB con datos embebidos)
- Datos extraídos de los CSV/zip `Qualitivity 0727 *` vía `extract_qualitivity.py`
- External dependencies: D3.js + TopoJSON (CDN, optional — tile map fallback if offline; Google Fonts fue retirado por el requisito offline)

### Architecture

```
┌─────────────────────────────────────────────┐
│  qualitivity_intelligence_v6.html           │
│                                             │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ DATA LAYER  │  │ INTELLIGENCE LAYER   │  │
│  │             │  │                      │  │
│  │ 3M: 415    │  │ NLP Parser (ES/EN/KO)│  │
│  │ DC: 378    │  │ Scored intent system  │  │
│  │ 12M: 30,871│  │ 8 system categories  │  │
│  │ Sales: parcial│ 10 visualization fns │  │
│  │ Climate: 50│  │ Month/filter parser   │  │
│  │ Monthly: 50×12│                      │  │
│  └─────────────┘  └──────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ UI: Chat interface + KPI strip      │   │
│  │ Quick-action chips (23)             │   │
│  │ Dataset tabs (All/3M/DC/12M)        │   │
│  │ Custom Variables panel              │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Data Sources Embedded

| Variable | Description | Size |
|----------|-------------|------|
| `QUALITIVITY_DATA` | 3M + DC claim records (750 records, 25+ fields each) | ~580 KB |
| `QUALITIVITY_12M_COLS` / `_ROWS` | 12M claims in compact array format (10,606 records) | ~1.8 MB |
| `US_SALES_BY_STATE` | Vehicle sales by US state (50 states, extracted from dealer codes) | ~1 KB |
| `US_CLIMATE` | NOAA annual climate normals per state (temp, precip, snow, humidity) | ~6 KB |
| `US_MONTHLY_TEMP` | Monthly avg temperature per state (50 × 12) | ~3 KB |
| `US_MONTHLY_PRECIP` | Monthly avg precipitation per state (50 × 12) | ~3 KB |
| `TILE` | US tile map grid positions (FiveThirtyEight-style layout) | ~1 KB |
| `US_TOPO` | TopoJSON US states (loaded async from CDN, not embedded) | ~45 KB |

### Claim Record Schema

Fields available on each 3M/DC record (12M has a subset):

```
no, brand, proj, model, partNo, keyParts, safety, partNM, system,
natCode, natName, causeCode, comment, confMonth, stockP, useP,
mileage, claims, partCost, laborCost, outsource, totalCost,
nation, region, dealer, devName, faultCorp, vin, state
```

The `state` field is derived from the dealer code prefix (e.g., `FL112` → `FL`).

---

## Feature Inventory

### Visualization Functions (10)

| Function | Output | Used for |
|----------|--------|----------|
| `mkBar(items, metric, title)` | Horizontal bar chart with % labels | Rankings, trends |
| `mkTbl(items, cols)` | Scrollable data table | Detail views |
| `mkHeat(data, rowField, colField, title)` | Grid heatmap | Cross-dimensional analysis |
| `mkPareto(items, title)` | Bar chart with cumulative % + 80/20 analysis | Pareto principle |
| `mkDonut(items, title)` | SVG donut chart with legend | Distribution views |
| `mkScatter(data, title)` | Mileage vs Cost scatter plot | Outlier detection |
| `mkTreemap(items, title)` | Proportional box layout | Volume visualization |
| `mkMap(data, title, normalized)` | Tile map (FiveThirtyEight grid) | Geographic analysis |
| `mkRealMap(data, title, norm, overlayVar, overlayLabel, monthIdx)` | D3 choropleth + climate overlay | Geographic + environmental |
| `mkClimateCorrelation(data, climateVar, label, title)` | Scatter + Pearson r correlation | Environmental analysis |

### NLP Intent Types (14)

| Intent | Trigger Keywords (ES/EN/KO) | Generator |
|--------|----------------------------|-----------|
| `ranking` | top, ranking, principales, 상위 | `genRanking` |
| `analysis` | battery, bateria, + any part filter | `genAnalysis` |
| `trend` | trend, tendencia, monthly, 월별 | `genTrend` |
| `summary` | summary, resumen, dashboard, 요약 | `genSummary` |
| `comparison` | compare, comparar, vs, 비교 | `genComparison` |
| `anomaly` | flag, anomaly, abnormal, 이상 | `genEnhancedAnomaly` |
| `map` | map, mapa, geographic, 지도 | `genMap` |
| `heatmap` | heatmap, mapa de calor, 히트맵 | `genHeatmap` |
| `climate` | climate, temperatura, rain, 기후 | `genClimate` |
| `pareto` | pareto | `genRanking` (viz=pareto) |
| `donut` | donut, pie, pastel, 원형 | `genRanking` (viz=donut) |
| `scatter` | scatter, dispersión, 산점도 | Direct `mkScatter` |
| `stratification` | stratification, estratificación, 분석 | Routes to analysis or summary |
| `detail` | detail, detalle, list, 목록 | `genDetail` |

### Smart System Categories (8)

| Category | NLP Keywords | Qualitivity Systems | Part Patterns |
|----------|-------------|-------------------|---------------|
| `electrical` | battery, wiring, lamp, horn, fob, sensor, charging | Electron | BATTERY, WIRING, BDC, JUNCTION, FOB, HORN, LAMP |
| `powertrain` | engine, motor, cvt, transmission, oxygen, throttle | Engine, TM | TRANSAXLE, SENSOR OXYGEN, ELECTRONIC CONTROL |
| `hvac` | hvac, a/c, climate, cooling, heater, blower | (cross-system) | HEATER, BLOWER, COMPRESSOR, EVAPORATOR |
| `braking` | brake, freno, abs, caliper, pad, hydraulic | Chassis | BRAKE, CALIPER, PAD, HYDRAULIC, CYLINDER BRAKE |
| `steering` | steering, alignment, shock, suspension, tpms, drift | Chassis | ALIGNMENT, SHOCK, WHEEL, TPMS |
| `infotainment` | display, monitor, speaker, audio, camera, cluster | Infotainment | MONITOR, SPEAKER, HEAD UNIT, CLUSTER, AVN |
| `body` | door, handle, window, mirror, seat, belt, panel | Trim, Body | HANDLE, LATCH, MOULDING, LAMP, GLASS, WIPER |
| `safety` | airbag, srs, restraint, collision | (cross-system) | AIR BAG, SRS, RESTRAINT |

### Quick-Action Chips (23)

```
📊 Dashboard  🗺️ USA Map  🌡️ Climate  🔋 Battery CL4
❄️ HVAC/AC  ⚡ Electrical  🔧 Powertrain  🛞 Braking
🎯 Steering  🎵 Infotainment  🚪 Body/Trim  🔥 Heatmap
📈 Trend  ⚖️ Compare  🚨 Anomalies  📉 Pareto
🏭 Suppliers  🍩 Systems  🇺🇸 Top USA  🇲🇽 México
🌲 Treemap  🔍 Scatter  💰 By Cost
```

---

## Key Queries to Test

```
# Basic
"Top 10 parts by cost in USA"
"Battery analysis for CL4"
"Monthly trend for Electron system"
"Compare all projects"

# Geographic
"Map of USA claims normalized by sales"
"Map battery claims January with temperature"
"Map HVAC claims July with temperature"
"Map brake claims December with precipitation"

# Climate correlation
"Climate correlation battery"
"Climate correlation analysis"

# Smart categories (trilingual)
"Electrical system analysis"
"Análisis del sistema de frenos"
"파워트레인 분석"

# Complex multi-filter
"Top 5 parts by cost for CL4 in USA"
"Pareto of Electron system claims"
"Flag dealer anomalies for battery"
```

---

## Build Process

### Regenerating from Source Data

The app is built by extracting data from `Qualitivity_0306.xlsm` using Python/openpyxl, then embedding as JS variables in the HTML.

```python
# Key extraction steps:
# 1. Read sheets: RO (3M), RO (DC), RO (12M), DB Sales (DC)
# 2. Extract 25+ fields per claim record
# 3. Derive 'state' from dealer code prefix (e.g., FL112 → FL)
# 4. Extract sales by state from DB Sales dealer codes
# 5. Build compact array format for 12M (cols + rows arrays)
# 6. Serialize as JS: QUALITIVITY_DATA, QUALITIVITY_12M_*, US_SALES_BY_STATE
# 7. Inject into HTML template between <script id="ds"> tags
```

### To Update with New Qualitivity Data

1. Get new `.xlsm` export from Qualitivity
2. Run extraction script (same Python used in this conversation)
3. Replace content between `<script id="ds">` and `</script>` tags
4. Climate/sales data only needs updating if model year or dealer network changes

---

## Roadmap (from original briefing)

### Phase 1 — Structured Data Queries ✅ DONE
- Load Qualitivity Excel data
- Natural language query engine
- Visualizations: bar, table, heatmap, pareto, donut, scatter, treemap, tile map, D3 choropleth
- Climate correlation analysis
- Dealer anomaly detection
- Trilingual NLP (ES/EN/KO)

### Phase 2 — Document Search (RAG) — NOT STARTED
- Ingest 8D reports, lessons learned, investigation PDFs
- Vector DB (ChromaDB/FAISS) + embeddings (sentence-transformers)
- Answer queries like "What happened last time we had door seal problems?"
- Requires Python + Ollama (local LLM) or Claude API

### Phase 3 — Combined Intelligence — NOT STARTED
- Combine structured data + document search
- Generate monthly management reports
- "Battery is trending up — what previous countermeasures were applied?"
- Streamlit interface preferred

### Phase 4 — W2P Fields (from briefing)
- Add: W2P Phase, CIS Score, CIS Priority, Failure Mode Cluster
- Heal the Customer tracking
- Read-Across management
- Fix at Source / Prevention Confirmed

---

## Technical Constraints

- **Must run offline** — KMX IT restricts external cloud services
- **Single-file HTML** — zero installation, opens with double-click
- **No backend** — all processing in browser JavaScript
- **localStorage key `jm_taskboard_v4`** — PROTECTED, do not touch (QA Test Planning data)
- **D3 + TopoJSON loaded from CDN** — optional, degrades gracefully to tile map

---

## Claude Code Tasks

When working on this project in Claude Code, typical tasks include:

### Adding new query types
1. Add keyword patterns to `parse()` function
2. Create `genNewType()` response generator
3. Add chip to `CHIPS` array
4. Wire into `proc()` switch statement

### Updating data
1. Use openpyxl to extract from new `.xlsm`
2. Generate JS data block
3. Replace between `<script id="ds">` tags

### Adding new visualizations
1. Create `mkNewViz(data, title)` function
2. Return HTML string with inline styles (uses CSS variables)
3. Call from relevant generators

### Refactoring to multi-file (future)
```
qualitivity-intelligence/
├── index.html          # UI shell
├── css/
│   └── styles.css      # All styles
├── js/
│   ├── data.js         # Embedded Qualitivity data
│   ├── climate.js      # Climate datasets
│   ├── parser.js       # NLP query parser
│   ├── filters.js      # Data filtering/aggregation
│   ├── viz.js          # All visualization builders
│   ├── generators.js   # Response generators
│   ├── map.js          # D3 geographic map
│   └── app.js          # Chat UI, init, chips
├── data/
│   └── extract.py      # Python script to rebuild data.js from .xlsm
└── README.md
```

---

## CSS Design System

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg` | `#06090f` | Page background |
| `--sf` | `#0d1219` | Surface (cards, header) |
| `--sf2` | `#141c28` | Secondary surface |
| `--sf3` | `#1a2536` | Tertiary surface |
| `--bd` | `#1e2d44` | Borders |
| `--tx` | `#e8edf5` | Primary text |
| `--tx2` | `#8896ab` | Secondary text |
| `--tx3` | `#5a6a80` | Muted text |
| `--ac` | `#38bdf8` | Accent (sky blue) |
| `--pu` | `#a78bfa` | Purple |
| `--gn` | `#34d399` | Green |
| `--rd` | `#f87171` | Red |
| `--or` | `#fb923c` | Orange |
| `--yl` | `#fbbf24` | Yellow |

Fonts: `DM Sans` (UI), `JetBrains Mono` (data/monospace)

Chart palette (15 colors):
```javascript
const C = ['#38bdf8','#a78bfa','#34d399','#fb923c','#f472b6',
           '#fbbf24','#22d3ee','#f87171','#818cf8','#2dd4bf',
           '#e879f9','#a3e635','#fb7185','#67e8f9','#fdba74'];
```

Heatmap scale (11 steps, dark to bright blue):
```javascript
const HC = ['#0d1219','#0c2135','#0e3150','#11456e','#185a8c',
            '#2070aa','#2889c8','#38a8e0','#50c4f0','#7dd3fc','#bae6fd'];
```
