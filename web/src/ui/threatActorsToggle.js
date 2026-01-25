import { toggleThreatActorsHeatmap } from "../overlays/threatActorsHeatmap.js";

export function addThreatActorsToggle(map, onCountryClick) {
  const wrap = document.createElement("div");
  wrap.style.position = "absolute";
  wrap.style.top = "12px";
  wrap.style.left = "12px";
  wrap.style.zIndex = "5000";
  wrap.style.pointerEvents = "auto";
  wrap.style.display = "flex";
  wrap.style.gap = "8px";
  wrap.style.background = "rgba(31, 41, 55, 0.9)";
  wrap.style.padding = "6px";
  wrap.style.borderRadius = "8px";
  wrap.style.backdropFilter = "blur(10px)";

  wrap.innerHTML = `
    <button id="taToggle" style="padding:6px 10px;border-radius:6px;border:none;background:#3b82f6;color:#fff;cursor:pointer;font-size:13px;font-weight:500;">Off</button>
    <select id="taMode" style="padding:6px 8px;border-radius:6px;border:none;background:#374151;color:#fff;cursor:pointer;font-size:13px;" disabled>
      <option value="heatmap">Heatmap</option>
      <option value="country">Country View</option>
    </select>
  `;

  document.body.appendChild(wrap);

  let on = false;
  let mode = "heatmap";
  const toggleBtn = wrap.querySelector("#taToggle");
  const modeSelect = wrap.querySelector("#taMode");

  async function applyVisualization() {
    toggleBtn.disabled = true;
    modeSelect.disabled = true;

    try {
      // Always turn off heatmap first
      await toggleThreatActorsHeatmap(map, false);

      if (on) {
        if (mode === "heatmap") {
          await toggleThreatActorsHeatmap(map, true);
        } else {
          // Country view - use bubble layer with click handler
          await toggleThreatActorsHeatmap(map, true, onCountryClick);
        }
      }

      toggleBtn.textContent = on ? "On" : "Off";
      toggleBtn.style.background = on ? "#10b981" : "#3b82f6";
      modeSelect.disabled = !on;
    } catch (e) {
      console.error("Visualization toggle failed:", e);
      const msg = e?.message || String(e);
      if (msg) alert("Failed to toggle visualization: " + msg);
      on = false;
      toggleBtn.textContent = "Off";
      toggleBtn.style.background = "#3b82f6";
      modeSelect.disabled = true;
    } finally {
      toggleBtn.disabled = false;
      if (on) modeSelect.disabled = false;
    }
  }

  toggleBtn.addEventListener("click", async () => {
    on = !on;
    await applyVisualization();
  });

  modeSelect.addEventListener("change", async () => {
    mode = modeSelect.value;
    if (on) {
      await applyVisualization();
    }
  });
}
