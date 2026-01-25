import { toggleThreatActorsChoropleth } from "../overlays/threatActorsChoropleth.js";

export function addChoroplethToggle(map, onCountryClick) {
  const wrap = document.createElement("div");
  wrap.style.position = "absolute";
  wrap.style.top = "56px"; // Position below the threat actors button
  wrap.style.left = "12px";
  wrap.style.zIndex = "5000";
  wrap.style.pointerEvents = "auto";

  wrap.innerHTML = `
    <button id="choroplethBtn" style="padding:6px 10px;border-radius:6px;border:none;background:#1f2937;color:#fff;cursor:pointer;">
      Country View
    </button>
  `;

  document.body.appendChild(wrap);

  let on = false;
  const btn = wrap.querySelector("#choroplethBtn");

  btn.addEventListener("click", async () => {
    btn.disabled = true;

    try {
      on = !on;

      await toggleThreatActorsChoropleth(map, on, onCountryClick);

      btn.style.opacity = on ? "1" : "0.8";
      btn.style.background = on ? "#3b82f6" : "#1f2937"; // Blue when active
      console.log("Country View toggled:", on);
    } catch (e) {
      console.error("Country View toggle failed:", e);

      const msg = (e && (e.message || e.toString())) ? (e.message || e.toString()) : "";
      if (msg) alert("Country View toggle failed: " + msg);

      on = false;
      btn.style.opacity = "0.8";
      btn.style.background = "#1f2937";
    } finally {
      btn.disabled = false;
    }
  });
}
