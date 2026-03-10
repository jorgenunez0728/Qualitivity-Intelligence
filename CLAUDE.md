# CLAUDE.md — Project Instructions for Claude Code

## Project: Qualitivity Intelligence

Single-file HTML quality intelligence app for KIA México (KMX) warranty claim analysis.

## Quick Start

```bash
# View the app
open qualitivity_intelligence_v5.html

# Rebuild data from new Qualitivity export
python extract_qualitivity.py Qualitivity_MMDD.xlsm > data_block.js
# Then replace content between <script id="ds"> and </script> in the HTML
```

## File Structure

```
qualitivity-intelligence/
├── CLAUDE.md                              # This file — Claude Code instructions
├── QUALITIVITY_INTELLIGENCE_HANDOFF.md    # Full technical documentation
├── qualitivity_intelligence_v5.html       # The app (single-file, ~2.4 MB)
├── extract_qualitivity.py                 # Python: rebuild data.js from .xlsm
├── LLM_RAG_Prototype_Briefing.md          # Original requirements briefing
└── data/
    └── Qualitivity_0306.xlsm             # Source data (confidential)
```

## Architecture

The app is a single HTML file with embedded JS data (~2.3 MB of warranty claim records). It provides a chat-style interface where users type natural language queries in Spanish, English, or Korean, and get back data visualizations and analysis.

**No backend. No build step. No npm. No framework.** Just open the HTML in a browser.

### Key components inside the HTML:

1. **Data Layer** — JS variables: `QUALITIVITY_DATA`, `QUALITIVITY_12M_COLS/ROWS`, `US_SALES_BY_STATE`, `US_CLIMATE`, `US_MONTHLY_TEMP/PRECIP`
2. **NLP Parser** — `parse(query)` → returns intent object with type, filters, groupBy, metric, viz hint
3. **Data Engine** — `flt(data, filters)` + `ag(data, groupBy, metric)` for filtering and aggregation
4. **Viz Builders** — 10 functions: `mkBar`, `mkTbl`, `mkHeat`, `mkPareto`, `mkDonut`, `mkScatter`, `mkTreemap`, `mkMap` (tile), `mkRealMap` (D3), `mkClimateCorrelation`
5. **Response Generators** — `genRanking`, `genAnalysis`, `genTrend`, `genSummary`, `genComparison`, `genAnomaly`, `genMap`, `genHeatmap`, `genClimate`, `genDetail`
6. **Smart Categories** — `SYS_CAT` object maps NLP keywords → Qualitivity system/part filters for: electrical, powertrain, hvac, braking, steering, infotainment, body, safety

## Common Tasks

### Add a new query type
1. Add keyword regex to `parse()` function (support ES/EN/KO)
2. Create `genNewType(I)` that returns HTML string
3. Add to `proc(q)` switch statement
4. Add chip to `CHIPS` array

### Add a new visualization
1. Create `mkNewViz(data, params)` that returns HTML string
2. Use CSS variables (`var(--ac)`, `var(--sf2)`, etc.) for theming
3. Use `.cb` class wrapper for consistent card styling
4. Use `.ct` class for chart titles

### Update claim data
```bash
python extract_qualitivity.py NewFile.xlsm > new_data.js
```
Then replace the JS block between `<script id="ds">` tags. The climate data doesn't need updating — it's NOAA normals.

### Add a new smart system category
Add entry to `SYS_CAT` object:
```javascript
'newcat': {
  label: 'Label EN / Label ES / 라벨',
  kw: /regex|for|nlp|keywords/,
  systems: ['Qualitivity System Name'],
  parts: /REGEX|FOR|PART|NAMES/
}
```

## Constraints

- **Offline-first**: KMX IT blocks cloud services. App must work without internet.
- **Single-file HTML**: No npm, no build tools, no server. IT can't install anything.
- **Protected localStorage key**: `jm_taskboard_v4` — never touch (QA Test Planning app data).
- **D3+TopoJSON are optional**: Loaded from CDN for real maps. Falls back to tile map offline.
- **Bilingual minimum**: All user-facing strings should work in Spanish and English. Korean keywords are a bonus.
- **Data is confidential**: Real warranty claims with VINs and dealer codes. Don't expose externally.

## Phase 2 Roadmap (next)

The next phase adds RAG (Retrieval Augmented Generation) over investigation documents:
- Ingest 8D reports, lessons learned, EWR PDFs
- Vector DB: ChromaDB or FAISS (file-based, no server)
- Embeddings: sentence-transformers (all-MiniLM-L6-v2, CPU)
- LLM: Ollama running Llama 3 8B or Mistral 7B locally
- Framework: LangChain for RAG orchestration
- Interface: Streamlit (local web app)

This will be a separate Python project that coexists with the HTML app.

## Testing

Open the HTML file in Chrome/Edge. Try these queries:
```
Top 10 parts by cost USA
Battery analysis CL4
Map USA claims normalized by sales
Map battery claims January with temperature
Climate correlation analysis
Electrical system analysis
Flag dealer anomalies
Compare projects
Monthly trend
Pareto top 15 parts
```

## Code Style

- Functions use short names (`flt`, `ag`, `mkBar`, `genMap`) — this is intentional to keep the single-file compact
- CSS classes also use short names (`.cb` = chart box, `.ct` = chart title, `.br` = bar row, etc.)
- HTML is generated as string concatenation, not DOM manipulation (for performance with 10K+ records)
- `esc()` function for HTML escaping user-facing data
- `tr(string, maxLen)` for truncation with ellipsis
