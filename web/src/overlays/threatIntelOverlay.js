/* global atlas */

/*
Threat Intelligence IP Overlay

Fetches threat intelligence indicators from Azure Log Analytics,
geolocates IP addresses, and displays them as points on the map.
*/

// Layer IDs
const THREAT_INTEL_SOURCE_ID = "threat-intel-source";
const THREAT_INTEL_LAYER_ID = "threat-intel-layer";

// State
let isEnabled = false;

// Country centroids for IP geolocation (expanded from threat actors)
const COUNTRY_CENTROIDS = {
  "AD": [1.5218, 42.5075], "AE": [54.3, 24.3], "AF": [67.7, 33.9], "AG": [-61.8, 17.1],
  "AI": [-63.0, 18.2], "AL": [20.1, 41.2], "AM": [45.0, 40.1], "AO": [17.9, -11.2],
  "AQ": [0.0, -75.3], "AR": [-63.6, -38.4], "AS": [-170.1, -14.3], "AT": [14.6, 47.5],
  "AU": [133.8, -25.3], "AW": [-69.9, 12.5], "AX": [20.0, 60.2], "AZ": [47.6, 40.1],
  "BA": [17.7, 43.9], "BB": [-59.5, 13.2], "BD": [90.4, 23.7], "BE": [4.5, 50.5],
  "BF": [-1.6, 12.2], "BG": [25.5, 42.7], "BH": [50.6, 26.1], "BI": [29.9, -3.4],
  "BJ": [2.3, 9.3], "BL": [-62.8, 17.9], "BM": [-64.8, 32.3], "BN": [114.7, 4.5],
  "BO": [-63.6, -16.3], "BQ": [-68.3, 12.2], "BR": [-51.9, -14.2], "BS": [-77.4, 25.0],
  "BT": [90.4, 27.5], "BV": [3.4, -54.4], "BW": [24.7, -22.3], "BY": [27.9, 53.7],
  "BZ": [-88.5, 17.2], "CA": [-106.3, 56.1], "CC": [96.9, -12.2], "CD": [21.8, -4.0],
  "CF": [20.9, 6.6], "CG": [15.8, -0.2], "CH": [8.2, 46.8], "CI": [-5.5, 7.5],
  "CK": [-159.8, -21.2], "CL": [-71.5, -35.7], "CM": [12.4, 7.4], "CN": [104.0, 35.0],
  "CO": [-74.3, 4.6], "CR": [-84.1, 10.0], "CU": [-77.8, 21.5], "CV": [-24.0, 16.0],
  "CW": [-69.0, 12.2], "CX": [105.7, -10.5], "CY": [33.4, 35.1], "CZ": [15.5, 49.8],
  "DE": [10.5, 51.2], "DJ": [42.6, 11.8], "DK": [9.5, 56.3], "DM": [-61.4, 15.4],
  "DO": [-70.2, 18.7], "DZ": [2.6, 28.0], "EC": [-78.2, -1.8], "EE": [25.0, 58.6],
  "EG": [30.8, 26.8], "EH": [-12.9, 24.2], "ER": [39.8, 15.2], "ES": [-3.7, 40.4],
  "ET": [40.5, 9.1], "FI": [25.7, 61.9], "FJ": [178.1, -16.6], "FK": [-59.5, -51.8],
  "FM": [158.2, 7.4], "FO": [-6.9, 62.0], "FR": [2.2, 46.2], "GA": [11.6, -0.8],
  "GB": [-3.4, 55.4], "GD": [-61.6, 12.3], "GE": [43.4, 42.3], "GF": [-53.1, 3.9],
  "GG": [-2.6, 49.5], "GH": [-1.0, 7.9], "GI": [-5.4, 36.1], "GL": [-42.6, 71.7],
  "GM": [-15.3, 13.4], "GN": [-9.7, 9.9], "GP": [-61.6, 16.3], "GQ": [10.3, 1.6],
  "GR": [21.8, 39.1], "GS": [-36.6, -54.4], "GT": [-90.2, 15.8], "GU": [144.8, 13.4],
  "GW": [-15.2, 11.8], "GY": [-58.9, 4.9], "HK": [114.1, 22.4], "HM": [73.5, -53.1],
  "HN": [-86.2, 15.2], "HR": [15.2, 45.1], "HT": [-72.3, 18.6], "HU": [19.5, 47.2],
  "ID": [113.9, -0.8], "IE": [-8.2, 53.4], "IL": [34.9, 31.0], "IM": [-4.5, 54.2],
  "IN": [78.9, 20.6], "IO": [71.9, -6.3], "IQ": [43.7, 33.2], "IR": [53.0, 32.0],
  "IS": [-19.0, 64.9], "IT": [12.6, 41.9], "JE": [-2.1, 49.2], "JM": [-77.3, 18.1],
  "JO": [36.2, 30.6], "JP": [138.3, 36.2], "KE": [37.9, -0.0], "KG": [74.8, 41.2],
  "KH": [105.0, 12.6], "KI": [-168.7, 1.9], "KM": [43.9, -11.9], "KN": [-62.8, 17.4],
  "KP": [127.5, 40.3], "KR": [127.8, 36.5], "KW": [47.5, 29.3], "KY": [-80.6, 19.5],
  "KZ": [66.9, 48.0], "LA": [102.5, 19.9], "LB": [35.9, 33.9], "LC": [-61.0, 13.9],
  "LI": [9.6, 47.2], "LK": [80.8, 7.9], "LR": [-9.4, 6.4], "LS": [28.2, -29.6],
  "LT": [23.9, 55.2], "LU": [6.1, 49.8], "LV": [24.6, 56.9], "LY": [17.2, 26.3],
  "MA": [-7.1, 31.8], "MC": [7.4, 43.7], "MD": [28.4, 47.4], "ME": [19.4, 42.7],
  "MF": [-63.1, 18.1], "MG": [46.9, -18.8], "MH": [171.2, 7.1], "MK": [21.7, 41.6],
  "ML": [-3.0, 17.6], "MM": [95.9, 22.0], "MN": [103.8, 46.9], "MO": [113.5, 22.2],
  "MP": [145.4, 17.3], "MQ": [-61.0, 14.6], "MR": [-10.9, 21.0], "MS": [-62.2, 16.7],
  "MT": [14.4, 35.9], "MU": [57.6, -20.3], "MV": [73.2, 3.2], "MW": [34.3, -13.3],
  "MX": [-102.6, 23.6], "MY": [101.8, 4.2], "MZ": [35.5, -18.7], "NA": [18.5, -22.1],
  "NC": [165.6, -20.9], "NE": [8.1, 17.6], "NF": [168.0, -29.0], "NG": [8.7, 9.1],
  "NI": [-85.2, 12.9], "NL": [5.3, 52.1], "NO": [8.5, 60.5], "NP": [84.1, 28.4],
  "NR": [166.9, -0.5], "NU": [-169.9, -19.1], "NZ": [174.9, -40.9], "OM": [55.9, 21.5],
  "PA": [-80.8, 8.5], "PE": [-75.0, -9.2], "PF": [-149.4, -17.7], "PG": [144.0, -6.3],
  "PH": [122.0, 12.9], "PK": [69.3, 30.4], "PL": [19.1, 51.9], "PM": [-56.3, 46.9],
  "PN": [-127.4, -24.7], "PR": [-66.6, 18.2], "PS": [35.2, 32.0], "PT": [-8.2, 39.4],
  "PW": [134.5, 7.5], "PY": [-58.4, -23.4], "QA": [51.2, 25.4], "RE": [55.5, -21.1],
  "RO": [25.0, 45.9], "RS": [21.0, 44.0], "RU": [100.0, 60.0], "RW": [29.9, -1.9],
  "SA": [45.1, 24.0], "SB": [160.2, -9.6], "SC": [55.5, -4.7], "SD": [30.2, 12.9],
  "SE": [18.6, 60.1], "SG": [103.8, 1.35], "SH": [-10.0, -24.1], "SI": [14.6, 46.1],
  "SJ": [23.7, 77.6], "SK": [19.7, 48.7], "SL": [-11.8, 8.5], "SM": [12.5, 43.9],
  "SN": [-14.5, 14.5], "SO": [46.2, 5.2], "SR": [-56.0, 3.9], "SS": [31.3, 8.0],
  "ST": [6.6, 0.2], "SV": [-88.9, 13.8], "SX": [-63.0, 18.0], "SY": [38.5, 35.0],
  "SZ": [31.5, -26.5], "TC": [-71.8, 21.7], "TD": [19.0, 15.5], "TF": [69.3, -49.3],
  "TG": [0.8, 8.6], "TH": [100.9, 15.9], "TJ": [71.3, 38.9], "TK": [-172.0, -9.2],
  "TL": [125.7, -8.9], "TM": [59.6, 38.9], "TN": [9.5, 33.9], "TO": [-175.2, -21.2],
  "TR": [35.2, 39.0], "TT": [-61.2, 10.7], "TV": [179.2, -7.1], "TW": [121.0, 23.7],
  "TZ": [34.9, -6.4], "UA": [31.2, 48.4], "UG": [32.3, 1.4], "UM": [-160.0, 19.3],
  "US": [-98.6, 39.8], "UY": [-55.8, -33.0], "UZ": [64.6, 41.4], "VA": [12.5, 41.9],
  "VC": [-61.3, 12.9], "VE": [-66.6, 6.4], "VG": [-64.6, 18.4], "VI": [-64.9, 18.3],
  "VN": [108.3, 14.1], "VU": [166.9, -15.4], "WF": [-177.2, -13.8], "WS": [-172.1, -13.8],
  "XK": [20.9, 42.6], "YE": [48.5, 15.6], "YT": [45.2, -12.8], "ZA": [22.9, -30.6],
  "ZM": [27.8, -13.1], "ZW": [29.2, -19.0]
};

/**
 * Toggle the threat intelligence IP overlay
 */
export async function toggleThreatIntelOverlay(map, turnOn) {
  if (turnOn && !isEnabled) {
    await enable(map);
  } else if (!turnOn && isEnabled) {
    disable(map);
  }
}

/**
 * Enable the overlay
 */
async function enable(map) {
  // Clean up existing if any
  disable(map);

  try {
    // Fetch threat intelligence data from standalone Function App
    console.log("Fetching threat intel data from external Function App...");
    // Use the standalone Function App which properly supports Managed Identity
    const response = await fetch("https://sentinel-maps-v2-api-gsgwe6fjemf4ejep.centralus-01.azurewebsites.net/api/threatIntel");
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error Details:", errorData);
      throw new Error(`Failed to fetch threat intel: ${response.status} - ${errorData.message || errorData.hint || "Unknown error"}`);
    }
    
    const data = await response.json();
    const indicators = data.indicators || [];
    
    if (indicators.length === 0) {
      console.warn("No threat intelligence indicators found");
      return;
    }

    // Extract unique IP addresses
    const ipAddresses = [...new Set(
      indicators
        .map(ind => ind.ObservableValue)
        .filter(ip => ip && isValidIP(ip))
    )];

    if (ipAddresses.length === 0) {
      console.warn("No valid IP addresses found in indicators");
      return;
    }

    // Geolocate IPs
    const geoResponse = await fetch("/api/ipGeolocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ipAddresses })
    });

    if (!geoResponse.ok) {
      throw new Error(`Failed to geolocate IPs: ${geoResponse.status}`);
    }

    const geoData = await geoResponse.json();
    const locations = geoData.locations || [];

    // Count IPs by country
    const countryCount = {};
    const ipToIndicator = {};
    
    // Map IPs to their indicators
    indicators.forEach(ind => {
      ipToIndicator[ind.ObservableValue] = ind;
    });

    // Aggregate by country
    locations.forEach(loc => {
      if (loc.success && loc.countryCode) {
        const code = loc.countryCode;
        if (!countryCount[code]) {
          countryCount[code] = {
            count: 0,
            ips: [],
            indicators: []
          };
        }
        countryCount[code].count++;
        countryCount[code].ips.push(loc.ip);
        if (ipToIndicator[loc.ip]) {
          countryCount[code].indicators.push(ipToIndicator[loc.ip]);
        }
      }
    });

    // Create GeoJSON features
    const features = Object.entries(countryCount)
      .filter(([code]) => COUNTRY_CENTROIDS[code])
      .map(([code, data]) => {
        const [lon, lat] = COUNTRY_CENTROIDS[code];
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [lon, lat]
          },
          properties: {
            countryCode: code,
            count: data.count,
            weight: data.count,
            ips: data.ips,
            // Summary for popup
            label: `${code}: ${data.count} threat IPs`,
            indicators: data.indicators
          }
        };
      });

    // Create data source
    const dataSource = new atlas.source.DataSource(THREAT_INTEL_SOURCE_ID);
    map.sources.add(dataSource);
    dataSource.add(features);

    // Find max count for color scaling
    const maxCount = Math.max(...features.map(f => f.properties.count), 1);

    // Add bubble layer
    const bubbleLayer = new atlas.layer.BubbleLayer(dataSource, THREAT_INTEL_LAYER_ID, {
      radius: [
        "interpolate",
        ["linear"],
        ["get", "count"],
        1, 5,
        maxCount / 2, 15,
        maxCount, 30
      ],
      color: [
        "interpolate",
        ["linear"],
        ["get", "count"],
        1, "#ff6b6b",      // Light red for low counts
        maxCount / 2, "#ee5a24",  // Orange for medium
        maxCount, "#c23616"       // Dark red for high counts
      ],
      strokeColor: "#ffffff",
      strokeWidth: 2,
      blur: 0.5,
      opacity: 0.8
    });

    map.layers.add(bubbleLayer);

    // Add popup on hover
    const popup = new atlas.Popup({
      pixelOffset: [0, -10],
      closeButton: false
    });

    map.events.add("mouseover", bubbleLayer, (e) => {
      if (e.shapes && e.shapes.length > 0) {
        const props = e.shapes[0].getProperties();
        const indicators = props.indicators || [];
        
        // Build popup content
        let content = `<div style="padding:10px">`;
        content += `<strong>${props.label}</strong><br/>`;
        content += `<hr style="margin:5px 0"/>`;
        
        // Show sample IPs and descriptions
        const sampleSize = Math.min(5, indicators.length);
        for (let i = 0; i < sampleSize; i++) {
          const ind = indicators[i];
          content += `<div style="font-size:11px;margin:3px 0">`;
          content += `<strong>${ind.ObservableValue}</strong><br/>`;
          if (ind.Description) {
            content += `${truncate(ind.Description, 60)}<br/>`;
          }
          if (ind.Type) {
            content += `Type: ${ind.Type}<br/>`;
          }
          content += `</div>`;
        }
        
        if (indicators.length > sampleSize) {
          content += `<div style="font-size:11px;font-style:italic">...and ${indicators.length - sampleSize} more</div>`;
        }
        
        content += `</div>`;
        
        popup.setOptions({
          content: content,
          position: e.shapes[0].getCoordinates()
        });
        popup.open(map);
      }
    });

    map.events.add("mouseleave", bubbleLayer, () => {
      popup.close();
    });

    isEnabled = true;
    console.log(`Threat Intel overlay enabled: ${features.length} countries, ${indicators.length} total IPs`);

  } catch (error) {
    console.error("Error enabling threat intel overlay:", error);
    disable(map);
    throw error;
  }
}

/**
 * Disable the overlay
 */
function disable(map) {
  if (map.layers.getLayerById(THREAT_INTEL_LAYER_ID)) {
    map.layers.remove(THREAT_INTEL_LAYER_ID);
  }
  if (map.sources.getById(THREAT_INTEL_SOURCE_ID)) {
    map.sources.remove(THREAT_INTEL_SOURCE_ID);
  }
  isEnabled = false;
}

/**
 * Basic IP validation
 */
function isValidIP(ip) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Truncate text
 */
function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text;
  return text.substring(0, maxLen) + "...";
}
