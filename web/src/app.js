import { createMap } from "./map/map-init.js";

const debugEl = document.getElementById("debug");
function debug(msg) {
  debugEl.textContent = msg + "\n" + debugEl.textContent;
}

async function main() {
  debug("Starting...");

  const map = await createMap({
    containerId: "map",
    initialView: { center: [-20, 25], zoom: 2 },
    style: "road"
  });

  debug("Map initializing...");

  map.events.add("ready", () => debug("Map ready."));
  map.events.add("error", (e) => debug("MAP ERROR: " + JSON.stringify(e)));

  document.getElementById("styleSelect").addEventListener("change", (e) => {
    map.setStyle({ style: e.target.value });
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    map.setCamera({ center: [-20, 25], zoom: 2 });
  });
}

main().catch((e) => {
  debug("Startup failed: " + (e && e.message ? e.message : String(e)));
});
