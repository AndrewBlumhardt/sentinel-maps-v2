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
  heatLayer: "taHeatLayer",
  polygonLayer: "taCountryPolygonLayer",
  outlineLayer: "taCountryOutlineLayer"
};

let enabled = false;
let currentMode = null;
let countryData = null;

export async function toggleThreatActorsHeatmap(map, turnOn, onCountryClick = null) {
  const mode = onCountryClick ? "country" : "heatmap";
  
  if (turnOn) {
    if (enabled && currentMode === mode) return;
    await enable(map, mode, onCountryClick);
    enabled = true;
    currentMode = mode;
  } else {
    if (!enabled) return;
    disable(map);
    enabled = false;
    currentMode = null;
  }
}

async function enable(map, mode, onCountryClick) {
  // Defensive cleanup
  if (map.layers.getLayerById(IDS.outlineLayer)) map.layers.remove(IDS.outlineLayer);
  if (map.layers.getLayerById(IDS.polygonLayer)) map.layers.remove(IDS.polygonLayer);
  if (map.layers.getLayerById(IDS.heatLayer)) map.layers.remove(IDS.heatLayer);
  if (map.sources.getById(IDS.source)) map.sources.remove(IDS.source);

  // Load TSV data
  const resp = await fetch("/data/threat-actors.tsv", { cache: "no-store" });
  if (!resp.ok) throw new Error("Could not load /data/threat-actors.tsv");

  const rows = parseTSV(await resp.text());

  // Count actors by country
  const counts = new Map();
  const actorsByCountry = new Map();

  for (const r of rows) {
    let country = (r.Location || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!country) continue;

    if (country === "United States of America" || country === "USA" || country === "US" || country === "U.S.") {
      country = "United States";
    }

    counts.set(country, (counts.get(country) || 0) + 1);
    
    if (!actorsByCountry.has(country)) {
      actorsByCountry.set(country, []);
    }
    actorsByCountry.get(country).push(r);
  }

  countryData = { counts, actorsByCountry };

  // Build point features
  const ds = new atlas.source.DataSource(IDS.source);

  for (const [country, count] of counts.entries()) {
    const coords = COUNTRY_CENTROIDS[country];
    if (!coords) continue;

    ds.add(
      new atlas.data.Feature(new atlas.data.Point(coords), {
        country,
        weight: count,
        count,
        actors: actorsByCountry.get(country)
      })
    );
  }

  map.sources.add(ds);

  if (mode === "country") {
    // Country view with large styled bubbles + click interactions
    const maxCount = Math.max(...counts.values());
    
    // Large bubble layer styled to represent countries with heatmap colors
    const bubbleLayer = new atlas.layer.BubbleLayer(ds, IDS.polygonLayer, {
      radius: [
        "interpolate",
        ["linear"],
        ["get", "count"],
        1, 60,
        10, 80,
        25, 100,
        50, 130,
        100, 160,
        200, 200
      ],
      color: [
        "interpolate",
        ["linear"],
        ["/", ["get", "count"], maxCount],
        0,    "#FDE725",  // Yellow (low) - heatmap palette
        0.2,  "#FCB323",  // Orange
        0.4,  "#F76839",  // Red-orange  
        0.6,  "#DD342D",  // Red
        0.8,  "#A50F15",  // Dark red
        1.0,  "#67000D"   // Deep red (high)
      ],
      opacity: 0.65,
      strokeColor: [
        "interpolate",
        ["linear"],
        ["/", ["get", "count"], maxCount],
        0,    "#FDE725",
        0.5,  "#F76839",
        1.0,  "#67000D"
      ],
      strokeWidth: 3,
      strokeOpacity: 0.9
    });

    map.layers.add(bubbleLayer);

    // Register click events after layer is added
    if (onCountryClick) {
      setTimeout(() => {
        map.events.add("click", bubbleLayer, (e) => {
          if (e.shapes && e.shapes.length > 0) {
            const props = e.shapes[0].getProperties();
            onCountryClick(props);
          }
        });

        map.events.add("mousemove", bubbleLayer, () => {
          map.getCanvasContainer().style.cursor = "pointer";
        });

        map.events.add("mouseleave", bubbleLayer, () => {
          map.getCanvasContainer().style.cursor = "grab";
        });
      }, 100);
    }
  } else {
    // Standard heatmap
    const heat = new atlas.layer.HeatMapLayer(ds, IDS.heatLayer, {
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
      radius: 45,
      intensity: 2,
      opacity: 0.85
    });

    map.layers.add(heat);
  }
}


function disable(map) {
  if (map.layers.getLayerById(IDS.outlineLayer)) map.layers.remove(IDS.outlineLayer);
  if (map.layers.getLayerById(IDS.polygonLayer)) map.layers.remove(IDS.polygonLayer);
  if (map.layers.getLayerById(IDS.heatLayer)) map.layers.remove(IDS.heatLayer);
  if (map.sources.getById(IDS.source)) map.sources.remove(IDS.source);
  map.getCanvasContainer().style.cursor = 'grab';
}
