import { toggleThreatActorsHeatmap } from "../overlays/threatActorsHeatmap.js";

export function addThreatActorsToggle(map) {
  const wrap = document.createElement("div");
  wrap.style.position = "absolute";
  wrap.style.top = "12px";
  wrap.style.left = "12px";
  wrap.style.zIndex = "5000";
  wrap.style.pointerEvents = "auto";

  wrap.innerHTML = `
    <button id="taBtn" style="padding:6px 10px;border-radius:6px;border:none;background:#1f2937;color:#fff;cursor:pointer;">
      Threat Actors
    </button>
  `;

  document.body.appendChild(wrap);

  let on = false;
  const btn = wrap.querySelector("#taBtn");

  btn.addEventListener("click", async () => {
    try {
      on = !on;
      await toggleThreatActorsHeatmap(map, on);
      btn.style.opacity = on ? "1" : "0.8";
      console.log("Threat Actors toggled:", on);
    } catch (e) {
      console.error("Threat Actors toggle failed:", e);
      alert("Threat Actors toggle failed. Check Console for details.");
      on = false;
      btn.style.opacity = "0.8";
    }
  });
}
