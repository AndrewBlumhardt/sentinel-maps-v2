/* global */

/**
 * Populate the left panel with country threat actor details
 */
export function showCountryDetails(countryProps) {
  const panel = document.getElementById("leftPanel");
  const titleEl = document.getElementById("panelTitle");
  const metaEl = document.getElementById("panelMeta");
  const listEl = document.getElementById("panelList");

  if (!panel || !titleEl || !metaEl || !listEl) {
    console.warn("Panel elements not found");
    return;
  }

  const { country, count, actors } = countryProps;

  // Update panel content
  titleEl.textContent = country || "Unknown Country";
  
  metaEl.innerHTML = `
    <div style="margin-bottom: 16px;">
      <strong>${count}</strong> threat actor${count !== 1 ? "s" : ""} identified
    </div>
  `;

  // Build actor list
  if (actors && actors.length > 0) {
    const actorItems = actors.map(actor => {
      const name = actor.Name || "Unknown";
      const motivation = actor.Motivation || "Unknown";
      const source = actor.Source || "";
      const otherNames = actor["Other names"] || "";

      return `
        <div style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(name)}</div>
          <div style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 4px;">
            <span style="display: inline-block; padding: 2px 8px; background: rgba(59, 130, 246, 0.2); border-radius: 4px; font-size: 11px;">
              ${escapeHtml(motivation)}
            </span>
          </div>
          ${otherNames ? `<div style="font-size: 12px; color: rgba(255,255,255,0.5);">aka: ${escapeHtml(otherNames)}</div>` : ""}
          ${source ? `<div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px;">Source: ${escapeHtml(source)}</div>` : ""}
        </div>
      `;
    }).join("");

    listEl.innerHTML = actorItems;
  } else {
    listEl.innerHTML = `<div style="padding: 12px; color: rgba(255,255,255,0.5);">No actors found</div>`;
  }

  // Show panel
  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
}

/**
 * Hide the left panel
 */
export function hidePanel() {
  const panel = document.getElementById("leftPanel");
  if (panel) {
    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
  }
}

/**
 * Initialize panel hide buttons
 */
export function initPanelControls() {
  const hideBtn = document.getElementById("panelHideBtn");
  
  // Close button in panel header
  if (hideBtn) {
    hideBtn.addEventListener("click", hidePanel);
  }
}

/**
 * Simple HTML escape to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
