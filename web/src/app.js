import { createMap } from "./map/map-init.js";

const map = createMap({
  containerId: "map",
  subscriptionKey: window.MAP_CONFIG.subscriptionKey
});

document.getElementById("styleSelect").addEventListener("change", e => {
  map.setStyle({ style: e.target.value });
});

document.getElementById("resetBtn").addEventListener("click", () => {
  map.setCamera({ center: [-20, 25], zoom: 2 });
});
