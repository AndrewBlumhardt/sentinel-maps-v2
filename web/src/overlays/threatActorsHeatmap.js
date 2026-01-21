import { parseTSV } from "../data/tsv.js";

/* global atlas */

// Minimal centroids so we can render without geocoding/boundary calls.
// Expand over time (or later add Lat/Lon to TSV and bypass this).
const COUNTRY_CENTROIDS = {
  "Russia": [100.0, 60.0],
  "China": [104.0, 35.0],
  "Iran": [53.0, 32.0],
  "Iraq": [43.7, 33.2],
  "Lebanon": [35.9, 33.9],
  "North Korea": [127.5, 40.3],
  "Vietnam": [108.3, 14.1],
  "Pakistan": [69.3, 30.4],
  "India": [78.9, 20.6],
  "Turkey": [35.2, 39.0],
  "Italy": [12.6, 41.9],
  "Belarus": [27.9, 53.7],
  "Ukraine": [31.2, 48.4],
  "Brazil": [-51.9, -14.2],
  "Mexico": [-102.6, 23.6],
  "Nigeria": [8.7, 9.1],
  "Israel": [34.9, 31.0],
  "United Arab Emirates": [54.3, 24.3],
  "Austria": [14.6, 47.5],
  "France": [2.2, 46.2],
  "Spain": [-3.7, 40.4],
  "Tunisia": [9.5, 33.9],
  "Algeria": [2.6, 28.0],
  "Saudi Arabia": [45.1, 24.0],
  "Libya": [17.2, 26.3],
  "Georgia": [43.4, 42.3],
  "Armenia": [45.0, 40.1],
  "Taiwan": [121.0, 23.7],
  "Indonesia": [113.9, -0.8],
  "Kazakhstan": [66.9, 48.0],
  "Syria": [38.5, 35.0],
  "Venezuela": [-66.6, 6.4],
  "Philippines": [122.0, 12.9],
  "Singapore": [103.8, 1.35],
  "Romania": [25.0, 45.9],
  "Uzbekistan": [64.6, 41.4],
  "Canada": [-106.3, 56.1],
  "United States of America": [-98.6, 39.8],
  "United States": [-98.6, 39.8],
  "Türkiye": [35.2, 39.0],
  "Gaza": [34.3, 31.35],
  "Korea": [127.8, 36.5] // generic fallback (your dataset includes "Korea")
};

const IDS = {
  source: "taByCountrySource",
  heatLayer: "taHeatLayer",
  labelLayer: "taCountLabelLayer"
};

let enabled = false;

export async function toggleThreatActorsHeatmap(map, turnOn) {
  if (turnOn) {
    if (enabled) return;
    await enable(map);
    enabled = true;
  } else {
    if (!enabled) return;
    disable(map);
    enabled = false;
  }
}

async function enable(map) {
  // 1) Load TSV
  const resp = await fetch("/data/threat-actors.tsv", { cache: "no-store" });
  if (!resp.ok) throw new Error("Could not load /data/threat-actors.tsv");

  const rows = parseTSV(await resp.text());
  console.log("Sample row:", rows[0]);

  // 2) Count by country
  const counts = new Map();
  for (const r of rows) {
    const country = (r.Location || "").trim();
    if (!country) continue;
    counts.set(country, (counts.get(country) || 0) + 1);
  }

  // DEBUG: verify expected countries are present
console.log("Threat actor counts by country:", Array.from(counts.entries()));

console.log(
  "US check:",
  "United States =", counts.get("United States"),
  "| United States of America =", counts.get("United States of America")
);

  // 3) Build point features (one per country) with a weight property
  const ds = new atlas.source.DataSource(IDS.source);

  for (const [country, count] of counts.entries()) {
    const coords = COUNTRY_CENTROIDS[country];
    if (!coords) continue; // skip until you add centroid (or add Lat/Lon later)

    ds.add(new atlas.data.Feature(
      new atlas.data.Point(coords),
      {
        country,
        count,
        // HeatMapLayer looks for a weight value; we’ll use count directly.
        weight: count
      }
    ));
  }

  map.sources.add(ds);

  // 4) Heatmap layer (native)
  // Weighted heatmap uses a property to define intensity per point. :contentReference[oaicite:2]{index=2}
  const heat = new atlas.layer.HeatMapLayer(ds, IDS.heatLayer, {
    // Use the count as the weight.
    weight: ["get", "weight"],

    // These settings are intentionally conservative. You can tune later.
    radius: 25,
    intensity: 1,
    opacity: 0.75
  });

  map.layers.add(heat);

  // 5) Optional: show counts as labels on top (helps learning/validation)
  const labels = new atlas.layer.SymbolLayer(ds, IDS.labelLayer, {
    iconOptions: {
      image: "none",
      allowOverlap: true
    },
    textOptions: {
      textField: ["to-string", ["get", "count"]],
      allowOverlap: true,
      offset: [0, 0],
      size: 14
    }
  });

  map.layers.add(labels);
}

function disable(map) {
  if (map.layers.getLayerById(IDS.labelLayer)) map.layers.remove(IDS.labelLayer);
  if (map.layers.getLayerById(IDS.heatLayer)) map.layers.remove(IDS.heatLayer);
  if (map.sources.getById(IDS.source)) map.sources.remove(IDS.source);
}