/* global atlas */

/**
 * Fetch Azure Maps configuration from the SWA Functions endpoint.
 * In local dev, you can optionally fall back to window.MAP_CONFIG if you kept it for local use,
 * but for SWA deployment we rely on /api/mapsConfig.
 */
/* global atlas */

async function getMapsConfig() {
  const resp = await fetch("/api/mapsConfig", { cache: "no-store" });
  if (!resp.ok) throw new Error("Failed to load /api/mapsConfig: " + resp.status);
  return await resp.json();
}

function addMapControls(map) {
  map.controls.add(
    [
      new atlas.control.ZoomControl(),
      new atlas.control.PitchControl()
    ],
    { position: "bottom-right" }
  );

  map.controls.add(new atlas.control.CompassControl(), { position: "bottom-left" });

  map.controls.add(
    new atlas.control.FullscreenControl({ hideIfUnsupported: true }),
    { position: "top-right" }
  );

  // Style picker (include satellite + labeled satellite)
  // Note: satellite styles may require your Azure Maps pricing tier to support imagery. :contentReference[oaicite:4]{index=4}
  map.controls.add(
    new atlas.control.StyleControl({
      mapStyles: [
        "road",
        "grayscale_light",
        "grayscale_dark",
        "night",
        "road_shaded_relief",
        "satellite",
        "satellite_road_labels"
      ]
    }),
    { position: "top-right" }
  );
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

  addMapControls(map);
  return map;
}
