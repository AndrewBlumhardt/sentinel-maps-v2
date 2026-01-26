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
  "Korea": [127.8, 36.5]
};

// ISO 3166-1 alpha-2 country codes for fetching boundaries
const COUNTRY_ISO_CODES = {
  "Russia": "RU",
  "China": "CN",
  "Iran": "IR",
  "Iraq": "IQ",
  "Lebanon": "LB",
  "North Korea": "KP",
  "Vietnam": "VN",
  "Pakistan": "PK",
  "India": "IN",
  "Turkey": "TR",
  "Türkiye": "TR",
  "Italy": "IT",
  "Belarus": "BY",
  "Ukraine": "UA",
  "Brazil": "BR",
  "Mexico": "MX",
  "Nigeria": "NG",
  "Israel": "IL",
  "United Arab Emirates": "AE",
  "Austria": "AT",
  "France": "FR",
  "Spain": "ES",
  "Tunisia": "TN",
  "Algeria": "DZ",
  "Saudi Arabia": "SA",
  "Libya": "LY",
  "Georgia": "GE",
  "Armenia": "AM",
  "Taiwan": "TW",
  "Indonesia": "ID",
  "Kazakhstan": "KZ",
  "Syria": "SY",
  "Venezuela": "VE",
  "Philippines": "PH",
  "Singapore": "SG",
  "Romania": "RO",
  "Uzbekistan": "UZ",
  "Canada": "CA",
  "United States of America": "US",
  "United States": "US",
  "Gaza": "PS",
  "Korea": "KR",
  "South Korea": "KR",
  "Germany": "DE",
  "Poland": "PL",
  "United Kingdom": "GB",
  "The Netherlands": "NL"
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

  const maxCount = Math.max(...counts.values());

  if (mode === "country") {
    // Country polygon view - fetch actual country boundaries
    const polygonSource = new atlas.source.DataSource(IDS.source);
    
    // Fetch country boundaries for each country with threat actors
    const boundaryPromises = [];
    for (const [country, count] of counts.entries()) {
      const isoCode = COUNTRY_ISO_CODES[country];
      if (!isoCode) {
        console.warn(`No ISO code for country: ${country}`);
        continue;
      }

      // Fetch country boundary using Fuzzy Search with geometry
      const subscriptionKey = map.authentication.getToken();
      const promise = fetch(
        `https://atlas.microsoft.com/search/fuzzy/json?api-version=1.0&query=${encodeURIComponent(country)}&typeahead=false&limit=1&countrySet=${isoCode}&entityType=Country&subscription-key=${subscriptionKey}`
      )
        .then(r => r.ok ? r.json() : Promise.reject('Search failed'))
        .then(searchData => {
          if (searchData && searchData.results && searchData.results.length > 0) {
            const result = searchData.results[0];
            // Use the viewport/bounding box to create a simple rectangle for now
            // This is a fallback since getting actual detailed boundaries requires additional API calls
            if (result.viewport) {
              const vp = result.viewport;
              // Create a simple bounding box polygon
              const polygon = new atlas.data.Polygon([[
                [vp.topLeftPoint.lon, vp.topLeftPoint.lat],
                [vp.btmRightPoint.lon, vp.topLeftPoint.lat],
                [vp.btmRightPoint.lon, vp.btmRightPoint.lat],
                [vp.topLeftPoint.lon, vp.btmRightPoint.lat],
                [vp.topLeftPoint.lon, vp.topLeftPoint.lat]
              ]]);
              
              return new atlas.data.Feature(polygon, {
                country,
                count,
                normalizedCount: count / maxCount,
                actors: actorsByCountry.get(country)
              });
            }
          }
          return null;
        })
        .catch(err => {
          console.warn(`Failed to fetch boundary for ${country}:`, err);
          return null;
        });

      boundaryPromises.push(promise);
    }

    // Wait for all boundaries to load
    const features = (await Promise.all(boundaryPromises)).filter(f => f !== null);
    
    if (features.length === 0) {
      console.error("Could not load any country boundaries");
      return; // Fall back gracefully
    }

    polygonSource.add(features);
    map.sources.add(polygonSource);
    polygonSource.add(features);
    map.sources.add(polygonSource);

    // Create polygon layer with heatmap colors
    const polygonLayer = new atlas.layer.PolygonLayer(polygonSource, IDS.polygonLayer, {
      fillColor: [
        "interpolate",
        ["linear"],
        ["get", "normalizedCount"],
        0,    "#FDE725",  // Yellow (low)
        0.2,  "#FCB323",  // Orange
        0.4,  "#F76839",  // Red-orange  
        0.6,  "#DD342D",  // Red
        0.8,  "#A50F15",  // Dark red
        1.0,  "#67000D"   // Deep red (high)
      ],
      fillOpacity: 0.65
    });

    // Outline layer for borders
    const outlineLayer = new atlas.layer.LineLayer(polygonSource, IDS.outlineLayer, {
      strokeColor: [
        "interpolate",
        ["linear"],
        ["get", "normalizedCount"],
        0,    "#FDE725",
        0.5,  "#F76839",
        1.0,  "#67000D"
      ],
      strokeWidth: 2,
      strokeOpacity: 0.9
    });

    map.layers.add(polygonLayer);
    map.layers.add(outlineLayer);

    // Add click handlers
    if (onCountryClick) {
      setTimeout(() => {
        map.events.add("click", polygonLayer, (e) => {
          if (e.shapes && e.shapes.length > 0) {
            const props = e.shapes[0].getProperties();
            onCountryClick(props);
          }
        });

        map.events.add("mousemove", polygonLayer, () => {
          map.getCanvasContainer().style.cursor = "pointer";
        });

        map.events.add("mouseleave", polygonLayer, () => {
          map.getCanvasContainer().style.cursor = "grab";
        });
      }, 100);
    }
  } else {
    // Heatmap mode - use point features at country centroids
    const ds = new atlas.source.DataSource(IDS.source);
    
    for (const [country, count] of counts.entries()) {
      const centroid = COUNTRY_CENTROIDS[country];
      if (!centroid) {
        console.warn(`No centroid defined for country: ${country}`);
        continue;
      }
      
      const weight = Math.max(1, count * 2);
      ds.add(
        new atlas.data.Feature(new atlas.data.Point(centroid), {
          weight,
          country,
          count,
          actors: actorsByCountry.get(country)
        })
      );
    }
    
    map.sources.add(ds);

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
