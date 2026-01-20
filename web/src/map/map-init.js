/* global atlas */

/**
 * Fetch Azure Maps configuration from the SWA Functions endpoint.
 * In local dev, you can optionally fall back to window.MAP_CONFIG if you kept it for local use,
 * but for SWA deployment we rely on /api/mapsConfig.
 */
async function getMapsConfig() {
  // Try SWA Function first
  try {
    const resp = await fetch("/api/mapsConfig", { cache: "no-store" });
    if (resp.ok) {
      return await resp.json();
    }
  } catch (e) {
    // Ignore and fall back below
  }

  // Optional fallback for local-only config.js if you still use it locally.
  if (window.MAP_CONFIG && window.MAP_CONFIG.subscriptionKey) {
    return { subscriptionKey: window.MAP_CONFIG.subscriptionKey };
  }

  throw new Error(
    "Unable to load Azure Maps config. Ensure /api/mapsConfig works and AZURE_MAPS_KEY is set in SWA."
  );
}

export async function createMap({ containerId, initialView, style }) {
  const cfg = await getMapsConfig();

  const map = new atlas.Map(containerId, {
    center: (initialView && initialView.center) || [-20, 25],
    zoom: (initialView && initialView.zoom) || 2,
    style: style || "road",
    authOptions: {
      authType: "subscriptionKey",
      subscriptionKey: cfg.subscriptionKey
    }
  });

  return map;
}
