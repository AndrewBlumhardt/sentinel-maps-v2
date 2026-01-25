import { parseTSV } from "../data/tsv.js";

/* global atlas */

/*
Threat Actor Country Overlay

This overlay shows colored circles at country centroids sized by threat actor counts.
Clicking a circle opens the detail panel.
*/

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
  "Türkiye": [35.2, 39.0],
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
  "Gaza": [34.3, 31.35],
  "Korea": [127.8, 36.5],
  "South Korea": [127.8, 36.5],
  "Germany": [10.5, 51.2],
  "The Netherlands": [5.3, 52.1],
  "United Kingdom": [-3.4, 55.4],
  "Poland": [19.1, 51.9]
};

const COUNTRY_ISO_MAP = {
  "Russia": "RUS",
  "China": "CHN",
  "Iran": "IRN",
  "Iraq": "IRQ",
  "Lebanon": "LBN",
  "North Korea": "PRK",
  "Vietnam": "VNM",
  "Pakistan": "PAK",
  "India": "IND",
  "Turkey": "TUR",
  "Türkiye": "TUR",
  "Italy": "ITA",
  "Belarus": "BLR",
  "Ukraine": "UKR",
  "Brazil": "BRA",
  "Mexico": "MEX",
  "Nigeria": "NGA",
  "Israel": "ISR",
  "United Arab Emirates": "ARE",
  "Austria": "AUT",
  "France": "FRA",
  "Spain": "ESP",
  "Tunisia": "TUN",
  "Algeria": "DZA",
  "Saudi Arabia": "SAU",
  "Libya": "LBY",
  "Georgia": "GEO",
  "Armenia": "ARM",
  "Taiwan": "TWN",
  "Indonesia": "IDN",
  "Kazakhstan": "KAZ",
  "Syria": "SYR",
  "Venezuela": "VEN",
  "Philippines": "PHL",
  "Singapore": "SGP",
  "Romania": "ROU",
  "Uzbekistan": "UZB",
  "Canada": "CAN",
  "United States of America": "USA",
  "United States": "USA",
  "Gaza": "PSE",
  "Korea": "KOR",
  "South Korea": "KOR",
  "Germany": "DEU",
  "The Netherlands": "NLD",
  "United Kingdom": "GBR",
  "Poland": "POL"
};

const IDS = {
  source: "taChoroplethSource",
  layer: "taChoroplethLayer",
  outlineLayer: "taChoroplethOutlineLayer"
};

let enabled = false;
let countryData = null; // Cache the country count data

/**
 * Toggle the choropleth overlay on/off
 */
export async function toggleThreatActorsChoropleth(map, turnOn, onCountryClick = null) {
  if (turnOn) {
    if (enabled) return;
    await enable(map, onCountryClick);
    enabled = true;
  } else {
    if (!enabled) return;
    disable(map);
    enabled = false;
  }
}

/**
 * Get the cached country data (for external use like panel updates)
 */
export function getCountryData() {
  return countryData;
}

async function enable(map, onCountryClick) {
  // Defensive cleanup
  if (map.layers.getLayerById(IDS.outlineLayer)) map.layers.remove(IDS.outlineLayer);
  if (map.layers.getLayerById(IDS.layer)) map.layers.remove(IDS.layer);
  if (map.sources.getById(IDS.source)) map.sources.remove(IDS.source);

  // Load and parse threat actor data
  const resp = await fetch("/data/threat-actors.tsv", { cache: "no-store" });
  if (!resp.ok) throw new Error("Could not load /data/threat-actors.tsv");

  const rows = parseTSV(await resp.text());

  // Count actors by country
  const counts = new Map();
  const actorsByCountry = new Map(); // Store actor details for panel

  for (const r of rows) {
    let country = (r.Location || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!country) continue;

    // Normalize country names
    if (country === "United States of America" || country === "USA" || country === "US" || country === "U.S.") {
      country = "United States";
    }

    counts.set(country, (counts.get(country) || 0) + 1);
    
    if (!actorsByCountry.has(country)) {
      actorsByCountry.set(country, []);
    }
    actorsByCountry.get(country).push(r);
  }

  // Store for external access
  countryData = {
    counts,
    actorsByCountry
  };

  // Find max count for color scaling
  const maxCount = Math.max(...counts.values());

  // Create GeoJSON features for each country
  const ds = new atlas.source.DataSource(IDS.source);
  
  for (const [country, count] of counts.entries()) {
    const isoCode = COUNTRY_ISO_MAP[country];
    if (!isoCode) {
      console.warn(`No ISO code mapping for country: ${country}`);
      continue;
    }

    // Create a simple polygon feature with country properties
    // Azure Maps will handle the actual country boundaries
    const feature = new atlas.data.Feature(
      new atlas.data.Point([0, 0]), // Placeholder geometry
      {
        country,
        isoCode,
        count,
        normalizedCount: count / maxCount,
        actors: actorsByCountry.get(country)
      }
    );
    
    ds.add(feature);
  }

  map.sources.add(ds);

  // Create polygon layer with color gradient
  const polygonLayer = new atlas.layer.PolygonLayer(ds, IDS.layer, {
    fillColor: [
      "interpolate",
      ["linear"],
      ["get", "normalizedCount"],
      0,    "rgba(255, 237, 160, 0.3)",  // Light yellow (low)
      0.2,  "rgba(254, 178, 76, 0.5)",   // Orange
      0.4,  "rgba(253, 141, 60, 0.6)",   // Deep orange
      0.6,  "rgba(240, 59, 32, 0.7)",    // Red-orange
      0.8,  "rgba(189, 0, 38, 0.8)",     // Dark red
      1.0,  "rgba(128, 0, 38, 0.85)"     // Deep crimson (high)
    ],
    fillOpacity: 0.7
  });

  // Create outline layer for country borders
  const outlineLayer = new atlas.layer.LineLayer(ds, IDS.outlineLayer, {
    strokeColor: "rgba(255, 255, 255, 0.5)",
    strokeWidth: 1
  });

  map.layers.add(polygonLayer);
  map.layers.add(outlineLayer);

  // Add click handler if provided
  if (onCountryClick) {
    map.events.add("click", IDS.layer, (e) => {
      if (e.shapes && e.shapes.length > 0) {
        const props = e.shapes[0].getProperties();
        onCountryClick(props);
      }
    });

    // Change cursor on hover
    map.events.add("mousemove", IDS.layer, () => {
      map.getCanvasContainer().style.cursor = "pointer";
    });

    map.events.add("mouseleave", IDS.layer, () => {
      map.getCanvasContainer().style.cursor = "grab";
    });
  }
}

function disable(map) {
  if (map.layers.getLayerById(IDS.outlineLayer)) map.layers.remove(IDS.outlineLayer);
  if (map.layers.getLayerById(IDS.layer)) map.layers.remove(IDS.layer);
  if (map.sources.getById(IDS.source)) map.sources.remove(IDS.source);
  
  // Reset cursor
  map.getCanvasContainer().style.cursor = "grab";
}
