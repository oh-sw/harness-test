// Pixel-art battle stage background renderer.
// Draws sky, distant mountains, floor and foreground decorations.

const CANVAS_W = 1280;
const CANVAS_H = 720;
const GROUND_Y = 600; // top of floor tiles

// Stage palette
const COLOR_SKY_TOP    = '#1A1A2E';
const COLOR_SKY_BTM    = '#16213E';
const COLOR_MOUNTAIN_1 = '#2C2C54';
const COLOR_MOUNTAIN_2 = '#393970';
const COLOR_FLOOR      = '#3B2A1A';
const COLOR_FLOOR_LINE = '#5C3D1E';
const COLOR_FLOOR_EDGE = '#7A5230';

/**
 * Draws the full stage background onto ctx.
 * Should be called first each frame, before drawing fighters.
 */
export function drawStage(ctx) {
  ctx.imageSmoothingEnabled = false;

  // Sky gradient — two flat bands to keep it pixelated
  ctx.fillStyle = COLOR_SKY_TOP;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y / 2);
  ctx.fillStyle = COLOR_SKY_BTM;
  ctx.fillRect(0, GROUND_Y / 2, CANVAS_W, GROUND_Y - GROUND_Y / 2);

  // Distant mountain silhouette (back layer)
  ctx.fillStyle = COLOR_MOUNTAIN_1;
  drawMountains(ctx, [
    { x: 0,    w: 260, h: 180 },
    { x: 220,  w: 200, h: 140 },
    { x: 500,  w: 280, h: 200 },
    { x: 720,  w: 240, h: 160 },
    { x: 900,  w: 300, h: 190 },
    { x: 1100, w: 250, h: 150 },
  ], GROUND_Y);

  // Closer mountain layer
  ctx.fillStyle = COLOR_MOUNTAIN_2;
  drawMountains(ctx, [
    { x: 80,  w: 180, h: 110 },
    { x: 340, w: 220, h: 130 },
    { x: 620, w: 190, h: 120 },
    { x: 850, w: 210, h: 140 },
    { x: 1050,w: 180, h: 100 },
  ], GROUND_Y);

  // Floor
  ctx.fillStyle = COLOR_FLOOR;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  // Floor top edge highlight
  ctx.fillStyle = COLOR_FLOOR_EDGE;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, 4);

  // Horizontal planks every 20px
  ctx.fillStyle = COLOR_FLOOR_LINE;
  for (let y = GROUND_Y + 20; y < CANVAS_H; y += 20) {
    ctx.fillRect(0, y, CANVAS_W, 2);
  }

  // Vertical board separators every 80px
  for (let x = 80; x < CANVAS_W; x += 80) {
    ctx.fillRect(x, GROUND_Y, 2, CANVAS_H - GROUND_Y);
  }
}

// Draws a row of triangle silhouette mountains using pixel-rect approximation.
function drawMountains(ctx, peaks, groundY) {
  for (const { x, w, h } of peaks) {
    const peakX = x + Math.floor(w / 2);
    const baseY = groundY;
    // Draw as a series of horizontal bars, narrowing towards the peak
    const steps = 16; // pixel resolution of slope
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const barY = baseY - Math.round(h * t);
      const barW = Math.round(w * (1 - t));
      const barX = peakX - Math.floor(barW / 2);
      ctx.fillRect(barX, barY, barW, Math.ceil(h / steps) + 1);
    }
  }
}
