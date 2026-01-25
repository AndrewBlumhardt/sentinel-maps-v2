# Sentinel Maps V2 - AI Agent Instructions

## Architecture Overview

This is an **Azure Static Web Apps** project visualizing threat actor geolocation data on Azure Maps. Two-tier architecture:

- **`web/`**: Vanilla JS frontend (no build step) using Azure Maps SDK v3
- **`api/`**: Azure Functions (Node.js) serving map configuration

The frontend fetches Azure Maps credentials from `/api/mapsConfig` at runtime rather than embedding keys in source.

## Key Components

### Data Flow
1. Browser loads `web/index.html` → `src/app.js` entry point
2. `map-init.js` fetches `/api/mapsConfig` to get Azure Maps subscription key
3. Map initializes with Azure Maps SDK (`atlas` global)
4. User clicks "Threat Actors" → `threatActorsToggle.js` calls `threatActorsHeatmap.js`
5. Heatmap loads `web/data/threat-actors.tsv`, aggregates by country, renders via `atlas.layer.HeatMapLayer`

### TSV Data Format
- **`web/data/threat-actors.tsv`**: Tab-separated file with columns: `Source`, `Name`, `Location`, `Motivation`, `Other names`
- Parsed by `src/data/tsv.js` → simple split on `\t` (TAB character)
- Country names in `Location` must match keys in `COUNTRY_CENTROIDS` map (`threatActorsHeatmap.js`)
- Common normalization: "United States of America" → "United States"

### Heatmap Implementation
- **One point per country** at hardcoded centroid (`COUNTRY_CENTROIDS` object in `threatActorsHeatmap.js`)
- Weight = count of threat actors from that country
- Uses Azure Maps data expressions: `["interpolate", ["linear"], ["get", "weight"], ...]` to map counts → heatmap intensity
- Add new countries by updating `COUNTRY_CENTROIDS` with `[longitude, latitude]`

## Development Patterns

### Local Development
- No build step required (vanilla JS with ES modules via `<script type="module">`)
- Serve `web/` directory with any static server
- For Functions API locally: Use Azure Functions Core Tools or mock `/api/mapsConfig` endpoint
- Optional: Use `web/config.sample.js` pattern (copy to `config.js`, add key) for local dev without Functions

### Azure Static Web Apps Specifics
- **App location**: `./web` (deployment root)
- **API location**: `./api` (managed Functions)
- **Output location**: `.` (no build artifacts)
- Environment variable `AZURE_MAPS_KEY` must be set in SWA configuration
- Functions run as integrated API (no CORS issues)

### File Organization
```
web/src/
├── app.js              # Entry point
├── map/map-init.js     # Map creation + controls
├── overlays/           # Layer toggle logic (heatmaps, etc.)
├── ui/                 # UI controls (buttons, panels)
└── data/               # Data parsers (TSV, etc.)
```

### Azure Maps SDK Conventions
- Global `atlas` object from CDN script (`<script src="https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js">`)
- Data sources: `atlas.source.DataSource(id)` → add to map with `map.sources.add(ds)`
- Layers: `atlas.layer.*Layer(source, id, options)` → add with `map.layers.add(layer)`
- Controls: `map.controls.add(control, {position: "top-right"})` (positions: `top-left`, `top-right`, `bottom-left`, `bottom-right`)

## Common Modifications

### Adding a New Country
1. Find centroid coordinates (longitude, latitude)
2. Add to `COUNTRY_CENTROIDS` in `web/src/overlays/threatActorsHeatmap.js`:
   ```js
   "Country Name": [longitude, latitude]
   ```
3. Ensure TSV `Location` column uses exact same country name

### Adjusting Heatmap Appearance
- **Radius**: Controls "blob" size → edit `radius` in `HeatMapLayer` options
- **Intensity/Opacity**: Controls overlay strength → edit `intensity` and `opacity`
- **Color gradient**: Modify `weight` interpolation stops (count thresholds and normalized values)

### Adding New Map Overlays
- Follow pattern in `overlays/threatActorsHeatmap.js`:
  - Export toggle function: `export async function toggleMyOverlay(map, turnOn)`
  - Use module-level state to track enabled/disabled
  - Cleanup existing layers/sources before re-adding (prevents "already exists" errors)
- Wire up UI in `ui/` folder (button with event listener calling toggle function)

### Extending TSV Data
- Add columns to `threat-actors.tsv` (tab-separated)
- Parser returns objects with column headers as keys
- Access in overlays: `rows.forEach(r => console.log(r.MyNewColumn))`

## Critical Notes

- **Always use TAB characters** in TSV files (not spaces)
- **Layer/source IDs** must be unique across all overlays (store as constants)
- **Defensive cleanup**: Remove layers/sources before adding to avoid errors (see `enable()` in `threatActorsHeatmap.js`)
- **Azure Maps pricing**: Satellite styles may require specific tier
- **No transpilation**: Write ES2020+ compatible code (async/await, `?.`, etc.)
