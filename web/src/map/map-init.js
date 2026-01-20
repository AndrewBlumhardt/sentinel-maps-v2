/* global atlas */

/**
 * Fetch Azure Maps configuration from the SWA Functions endpoint.
 * In local dev, you can optionally fall back to window.MAP_CONFIG if you kept it for local use,
 * but for SWA deployment we rely on /api/mapsConfig.
 */
/* global atlas */

async function getMapsConfig() {
  const resp = await fetch("/api/mapsConfig", { cache: "no-store" });
  if (!resp.ok) {
    throw new Error("Failed to load /api/mapsConfig. Status: " + resp.status);
  }
  return await resp.json();
}

function addMapControls(map) {
  // Bottom-right cluster: zoom + pitch.
  map.controls.add(
    [
      new atlas.control.ZoomControl(),
      new atlas.control.PitchControl()
    ],
    { position: "bottom-right" }
  );

  // Bottom-left: compass (rotation).
  map.controls.add(new atlas.control.CompassControl(), { position: "bottom-left" });

  // Top-right: style picker (acts like a “layer/style” selector).
  map.controls.add(new atlas.control.StyleControl(), { position: "top-right" });

  // Top-right: fullscreen toggle.
  map.controls.add(new atlas.control.FullscreenControl({ hideIfUnsupported: true }), {
    position: "top-right"
  });
}

export async function createMap({ containerId, initialView, style }) {
  const cfg = await getMapsConfig();

  const map = new atlas.Map(containerId, {
    center: (initialView && initialView.center) || [-20, 25],
    zoom: (initialView && initialView.zoom) || 2,
    pitch: (initialView && initialView.pitch) || 0,
    bearing: (initialView && initialView.bearing) || 0,
    style: style || "road",
    authOptions: {
      authType: "subscriptionKey",
      subscriptionKey: cfg.subscriptionKey
    }
  });

  // Controls can be added immediately.
  addMapControls(map);

  return map;
}
