/* global atlas */

/**
 * Auto-scroll control for Azure Maps
 * Pans the map continuously in a specified direction
 */

// ========== ADJUSTABLE SETTINGS ==========
// Change these values to modify auto-scroll behavior

// Speed: pixels per frame (higher = faster)
// Recommended range: 0.5 - 5.0
const SCROLL_SPEED = 1.0;

// Direction: angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)
// Examples: 0 = →, 45 = ↘, 90 = ↓, 135 = ↙, 180 = ←, 225 = ↖, 270 = ↑, 315 = ↗
const SCROLL_DIRECTION = 0;  // Default: scroll right

// ========== END ADJUSTABLE SETTINGS ==========

let isScrolling = false;
let animationId = null;

/**
 * Add auto-scroll control button to the map
 */
export function addAutoScrollControl(map) {
  const btn = document.createElement("button");
  btn.id = "autoScrollBtn";
  btn.style.position = "fixed";
  btn.style.bottom = "120px";
  btn.style.right = "10px";
  btn.style.zIndex = "5000";
  btn.style.width = "32px";
  btn.style.height = "32px";
  btn.style.padding = "0";
  btn.style.borderRadius = "4px";
  btn.style.border = "2px solid rgba(0,0,0,0.15)";
  btn.style.background = "#fff";
  btn.style.color = "#3b82f6";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "18px";
  btn.style.fontWeight = "400";
  btn.style.boxShadow = "0 0 4px rgba(0,0,0,0.3)";
  btn.style.transition = "all 0.2s";
  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.title = "Toggle auto-scroll";
  
  // Set arrow based on direction
  btn.innerHTML = getArrowForDirection(SCROLL_DIRECTION);
  
  document.body.appendChild(btn);
  
  btn.addEventListener("click", () => {
    isScrolling = !isScrolling;
    
    if (isScrolling) {
      btn.style.background = "#3b82f6";
      btn.style.color = "#fff";
      startAutoScroll(map);
    } else {
      btn.style.background = "#fff";
      btn.style.color = "#3b82f6";
      stopAutoScroll();
    }
  });
  
  btn.addEventListener("mouseenter", () => {
    if (!isScrolling) {
      btn.style.background = "#f0f0f0";
    }
  });
  
  btn.addEventListener("mouseleave", () => {
    if (!isScrolling) {
      btn.style.background = "#fff";
    }
  });
}

/**
 * Get appropriate arrow emoji based on direction
 */
function getArrowForDirection(degrees) {
  // Normalize to 0-360
  const normalized = ((degrees % 360) + 360) % 360;
  
  if (normalized >= 337.5 || normalized < 22.5) return "→";      // Right
  if (normalized >= 22.5 && normalized < 67.5) return "↘";       // Down-right
  if (normalized >= 67.5 && normalized < 112.5) return "↓";      // Down
  if (normalized >= 112.5 && normalized < 157.5) return "↙";     // Down-left
  if (normalized >= 157.5 && normalized < 202.5) return "←";     // Left
  if (normalized >= 202.5 && normalized < 247.5) return "↖";     // Up-left
  if (normalized >= 247.5 && normalized < 292.5) return "↑";     // Up
  if (normalized >= 292.5 && normalized < 337.5) return "↗";     // Up-right
  return "→";
}

/**
 * Start the auto-scroll animation
 */
function startAutoScroll(map) {
  if (animationId) return; // Already running
  
  // Convert direction to radians
  const radians = (SCROLL_DIRECTION * Math.PI) / 180;
  
  // Calculate x and y components
  const dx = Math.cos(radians) * SCROLL_SPEED;
  const dy = Math.sin(radians) * SCROLL_SPEED;
  
  function animate() {
    if (!isScrolling) return;
    
    const camera = map.getCamera();
    const currentCenter = camera.center;
    
    // Get current pixel position
    const pixels = map.positionsToPixels([currentCenter])[0];
    
    // Apply offset
    const newPixels = [pixels[0] + dx, pixels[1] + dy];
    
    // Convert back to position
    const newCenter = map.pixelsToPositions([newPixels])[0];
    
    // Update map center smoothly
    map.setCamera({
      center: newCenter,
      type: 'ease',
      duration: 50
    });
    
    animationId = requestAnimationFrame(animate);
  }
  
  animate();
}

/**
 * Stop the auto-scroll animation
 */
function stopAutoScroll() {
  isScrolling = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}
