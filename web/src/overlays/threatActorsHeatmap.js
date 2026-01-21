import { parseTSV } from "../data/tsv.js";

/* global atlas */

/*
Threat Actor Heatmap Overlay (Country-level)

User-facing overview:
- We load the threat actor TSV file.
- We count how many actors are associated with each country (Location column).
- We place ONE point per country (at an approximate centroid).
- We render those points using Azure Maps' native HeatMapLayer.
  The heatmap uses the per-country count as the "weight" so higher counts appear hotter.
*/

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
  heatLayer: "taHeatLayer"
};

// Module-level toggle state.
// Note: this assumes only one map instance is using this overlay.
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
  // Defensive cleanup:
  // If something from a previous toggle is still present, remove it first.
  // This prevents "already added" errors and handles partial-state situations.
  if (map.layers.getLayerById(IDS.heatLayer)) map.layers.remove(IDS.heatLayer);
  if (map.sources.getById(IDS.source)) map.sources.remove(IDS.source);

  // 1) Load TSV data
  // Use a relative path if you ever host under a subpath. For SWA with web as root, this is fine.
  const resp = await fetch("/data/threat-actors.tsv", { cache: "no-store" });
  if (!resp.ok) throw new Error("Could not load /data/threat-actors.tsv");

  const rows = parseTSV(await resp.text());

  // 2) Count actors by country (Location column)
  const counts = new Map();

  for (const r of rows) {
    // Normalize whitespace and special spaces to avoid mismatches in TSV edits.
    let country = (r.Location || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!country) continue;

    // Optional normalization for common US variants (safe even if not present).
    if (country === "United States of America" || country === "USA" || country === "US" || country === "U.S.") {
      country = "United States";
    }

    counts.set(country, (counts.get(country) || 0) + 1);
  }

  // 3) Build point features (one per country) with a weight property.
  // HeatMapLayer will use "weight" to determine how strongly each point influences the heatmap.
  const ds = new atlas.source.DataSource(IDS.source);

  for (const [country, count] of counts.entries()) {
    const coords = COUNTRY_CENTROIDS[country];
    if (!coords) continue; // if a country is missing, add its centroid above

    ds.add(
      new atlas.data.Feature(new atlas.data.Point(coords), {
        country,
        weight: count // aggregated actor count for this country
      })
    );
  }

  map.sources.add(ds);

  // 4) Heatmap layer (native Azure Maps)
  //
  // Why interpolate?
  // - Heatmaps can "saturate" quickly (many different counts look the same).
  // - We map raw counts into a 0–1 range using explicit stops so small values stay faint
  //   while large values become clearly hotter.
const heat = new atlas.layer.HeatMapLayer(ds, IDS.heatLayer, {
  // Stronger normalized mapping so the heatmap is visible at world zoom.
  // This keeps 7 distinct from 200 but avoids the faint “blue fog” effect.
  weight: [
    "interpolate",
    ["linear"],
    ["get", "weight"],
    1,   0.25,
    5,   0.45,
    10,  0.65,
    25,  0.95,
    50,  1.25,
    100, 1.60,
    200, 2.00
  ],

  // Larger radius makes country blobs visible at low zoom.
  radius: 45,

  // Higher intensity amplifies the signal without changing your underlying counts.
  intensity: 2.0,

  // Slightly higher opacity makes it easier to see.
  opacity: 0.85
});

function disable(map) {
  // Remove the heat layer and source. This fully removes the overlay.
  if (map.layers.getLayerById(IDS.heatLayer)) map.layers.remove(IDS.heatLayer);
  if (map.sources.getById(IDS.source)) map.sources.remove(IDS.source);
}