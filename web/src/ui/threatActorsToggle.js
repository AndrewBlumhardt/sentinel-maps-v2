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
  btn.disabled = true;

  try {
    on = !on;

    // If toggleThreatActorsHeatmap throws, we will see it here.
    await toggleThreatActorsHeatmap(map, on);

    btn.style.opacity = on ? "1" : "0.8";
    console.log("Threat Actors toggled:", on);
  } catch (e) {
    // Always log what we caught (some failures are not standard Error objects).
    console.error("Threat Actors toggle failed (caught):", e);

    // Only show an alert if we truly have an error-like object.
    const msg = (e && (e.message || e.toString())) ? (e.message || e.toString()) : "";
    if (msg) alert("Threat Actors toggle failed: " + msg);

    // Reset UI state
    on = false;
    btn.style.opacity = "0.8";
  } finally {
    btn.disabled = false;
  }
});
}
