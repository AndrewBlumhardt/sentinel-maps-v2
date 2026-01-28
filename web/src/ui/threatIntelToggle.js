import { toggleThreatIntelOverlay } from "../overlays/threatIntelOverlay.js";

export function addThreatIntelToggle(map) {
  const wrap = document.createElement("div");
  wrap.id = "threatIntelControlPanel";
  wrap.style.position = "fixed";
  wrap.style.top = "80px";
  wrap.style.left = "20px";
  wrap.style.zIndex = "5000";
  wrap.style.pointerEvents = "auto";
  wrap.style.background = "rgba(31, 41, 55, 0.95)";
  wrap.style.padding = "10px 12px";
  wrap.style.borderRadius = "8px";
  wrap.style.backdropFilter = "blur(10px)";
  wrap.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "8px";

  wrap.innerHTML = `
    <label style="color:#fff;font-size:14px;font-weight:600;">Threat Intel IPs</label>
    <button id="tiToggle" style="padding:8px 14px;border-radius:6px;border:none;background:#3b82f6;color:#fff;cursor:pointer;font-size:13px;font-weight:600;">Off</button>
    <span id="tiStatus" style="color:#94a3b8;font-size:12px;display:none;"></span>
  `;

  document.body.appendChild(wrap);

  const toggleBtn = document.getElementById("tiToggle");
  const statusSpan = document.getElementById("tiStatus");
  let isOn = false;

  toggleBtn.addEventListener("click", async () => {
    toggleBtn.disabled = true;
    statusSpan.textContent = "Loading...";
    statusSpan.style.display = "inline";

    try {
      isOn = !isOn;
      await toggleThreatIntelOverlay(map, isOn);

      toggleBtn.textContent = isOn ? "On" : "Off";
      toggleBtn.style.background = isOn ? "#10b981" : "#3b82f6";
      statusSpan.textContent = isOn ? "Active" : "";
      statusSpan.style.display = isOn ? "inline" : "none";
    } catch (error) {
      console.error("Failed to toggle threat intel:", error);
      isOn = !isOn; // Revert state
      toggleBtn.textContent = isOn ? "On" : "Off";
      toggleBtn.style.background = isOn ? "#10b981" : "#3b82f6";
      statusSpan.textContent = "Error loading data";
      statusSpan.style.color = "#ef4444";
      statusSpan.style.display = "inline";
      
      setTimeout(() => {
        statusSpan.style.display = "none";
        statusSpan.style.color = "#94a3b8";
      }, 3000);
    } finally {
      toggleBtn.disabled = false;
    }
  });
}
