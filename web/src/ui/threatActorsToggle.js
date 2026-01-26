import { toggleThreatActorsHeatmap } from "../overlays/threatActorsHeatmap.js";

export function addThreatActorsToggle(map, onCountryClick) {
  const wrap = document.createElement("div");
  wrap.id = "threatActorsControlPanel";
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
  wrap.style.transition = "transform 0.3s ease";

  wrap.innerHTML = `
    <label style="color:#fff;font-size:13px;font-weight:500;padding:0 8px;">Threat Map</label>
    <button id="taToggle" style="padding:6px 10px;border-radius:6px;border:none;background:#3b82f6;color:#fff;cursor:pointer;font-size:13px;font-weight:500;">Off</button>
    <select id="taMode" style="padding:6px 8px;border-radius:6px;border:none;background:#374151;color:#fff;cursor:pointer;font-size:13px;" disabled>
      <option value="heatmap">Heatmap</option>
      <option value="country">Country View</option>
    </select>
    <button id="hideControlPanel" style="padding:6px 10px;border-radius:6px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-size:13px;font-weight:600;margin-left:4px;">Hide ◀</button>
  `;

  document.body.appendChild(wrap);
  
  // Create show button (initially hidden)
  const showBtn = document.createElement("button");
  showBtn.id = "showControlPanel";
  showBtn.style.position = "absolute";
  showBtn.style.top = "12px";
  showBtn.style.left = "12px";
  showBtn.style.zIndex = "5000";
  showBtn.style.padding = "8px 12px";
  showBtn.style.borderRadius = "8px";
  showBtn.style.border = "none";
  showBtn.style.background = "#10b981";
  showBtn.style.color = "#fff";
  showBtn.style.cursor = "pointer";
  showBtn.style.fontSize = "14px";
  showBtn.style.fontWeight = "600";
  showBtn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  showBtn.style.display = "none";
  showBtn.textContent = "Show Controls ▶";
  document.body.appendChild(showBtn);

  let on = false;
  let mode = "heatmap";
  const toggleBtn = wrap.querySelector("#taToggle");
  const modeSelect = wrap.querySelector("#taMode");
  const hideBtn = wrap.querySelector("#hideControlPanel");
  
  // Hide/Show control panel handlers
  hideBtn.addEventListener("click", () => {
    const leftPanel = document.getElementById("leftPanel");
    wrap.style.transform = "translateX(-100%)";
    if (leftPanel) {
      leftPanel.classList.add("hidden");
    }
    setTimeout(() => {
      wrap.style.display = "none";
      showBtn.style.display = "block";
    }, 300);
  });
  
  showBtn.addEventListener("click", () => {
    wrap.style.display = "flex";
    setTimeout(() => {
      wrap.style.transform = "translateX(0)";
    }, 10);
    showBtn.style.display = "none";
  });

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
