// Pixel-art frame renderer.
// Draws a rectangular border of borderSize pixels at (x, y) with dimensions (w x h).
// The interior is NOT filled — callers draw the content before or after calling this.

export function drawFrame(ctx, x, y, w, h, color, borderSize = 4) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = color;

  // Top edge
  ctx.fillRect(x, y, w, borderSize);
  // Bottom edge
  ctx.fillRect(x, y + h - borderSize, w, borderSize);
  // Left edge
  ctx.fillRect(x, y, borderSize, h);
  // Right edge
  ctx.fillRect(x + w - borderSize, y, borderSize, h);

  // Corner accent dots (1px inside the border corners for pixel-art detail)
  const accent = shiftLightness(color, -30);
  ctx.fillStyle = accent;
  ctx.fillRect(x + borderSize, y + borderSize, 1, 1);
  ctx.fillRect(x + w - borderSize - 1, y + borderSize, 1, 1);
  ctx.fillRect(x + borderSize, y + h - borderSize - 1, 1, 1);
  ctx.fillRect(x + w - borderSize - 1, y + h - borderSize - 1, 1, 1);
}

// Darkens a hex colour by `amount` (0-255) for pixel-art corner accents.
function shiftLightness(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v + amount));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}
