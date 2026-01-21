import { toggleThreatActorsHeatmap } from "../overlays/threatActorsHeatmap.js";

export function addThreatActorsToggle(map) {
  const wrap = document.createElement("div");
  wrap.style.position = "absolute";
  wrap.style.top = "12px";
  wrap.style.left = "12px";
  wrap.style.zIndex = "5000";

  wrap.innerHTML = `
    <button id="taBtn" style="padding:6px 10px;border-radius:6px;border:none;background:#1f2937;color:#fff;cursor:pointer;">
      Threat Actors
    </button>
  `;

  document.body.appendChild(wrap);

  let on = false;
  wrap.querySelector("#taBtn").addEventListener("click", async () => {
    on = !on;
    await toggleThreatActorsHeatmap(map, on);
    wrap.querySelector("#taBtn").style.opacity = on ? "1" : "0.8";
  });
}