import { createMap } from "./map/map-init.js";
import { addThreatActorsToggle } from "./ui/threatActorsToggle.js";
import { addChoroplethToggle } from "./ui/choroplethToggle.js";
import { showCountryDetails, initPanelControls } from "./ui/panelManager.js";

const debugEl = document.getElementById("debug");
const overlayEl = document.getElementById("loadingOverlay");

function debug(msg) {
  if (!debugEl) return;
  debugEl.textContent = msg + "\n" + debugEl.textContent;
}

function hideLoading() {
  if (overlayEl) overlayEl.classList.add("hidden");
}

async function main() {
  debug("Starting…");

  const map = await createMap({
    containerId: "map",
    initialView: { center: [-20, 25], zoom: 2 },
    style: "road"
  });

  map.events.add("ready", () => {
    debug("Map ready.");
    hideLoading();
    
    // Initialize panel controls
    initPanelControls();
    
    // Add map overlays with click handlers
    addThreatActorsToggle(map);
    addChoroplethToggle(map, (countryProps) => {
      // Handle country click - show details in left panel
      showCountryDetails(countryProps);
    });
  });

  map.events.add("error", (e) => {
    debug("Map error: " + JSON.stringify(e));
    // Leave overlay up if you want, or hide and show error UI later.
  });
}

main().catch((e) => {
  debug("Startup failed: " + (e?.message || String(e)));
});
