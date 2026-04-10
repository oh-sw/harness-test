// Pixel-art fighter body sprite with face composited on top.
// Body is 48x80 pixels drawn with integer coordinates.

import { drawFace, FACE_W } from './face.js';
import { FIGHTER_W } from '../engine/fighter.js';

// Body palette
const COLOR_BODY   = '#2255CC'; // gi/uniform main
const COLOR_BODY_S = '#1A3D99'; // gi shadow
const COLOR_BELT   = '#CCAA00'; // belt
const COLOR_SKIN   = '#F5C5A3'; // hand/neck placeholder (overridden by face)
const COLOR_PANTS  = '#1A1A40';
const COLOR_SHOE   = '#111111';

/**
 * Draws the fighter body sprite at integer canvas position (x, y).
 * Face pixels are composited on top of the body using the fighter's faceParams.
 */
export function drawBody(ctx, x, y, faceParams) {
  ctx.imageSmoothingEnabled = false;
  const px = Math.round(x);
  const py = Math.round(y);

  // --- Torso (cols 10-37, rows 20-48) ---
  ctx.fillStyle = COLOR_BODY;
  ctx.fillRect(px + 10, py + 20, 28, 28);

  // Shadow stripe on torso right side
  ctx.fillStyle = COLOR_BODY_S;
  ctx.fillRect(px + 32, py + 20, 6, 28);

  // Belt (row 46-50)
  ctx.fillStyle = COLOR_BELT;
  ctx.fillRect(px + 10, py + 46, 28, 4);

  // Neck (cols 19-28, rows 15-20)
  ctx.fillStyle = COLOR_SKIN;
  ctx.fillRect(px + 19, py + 15, 10, 6);

  // Left arm (cols 2-12, rows 22-48)
  ctx.fillStyle = COLOR_BODY;
  ctx.fillRect(px + 2, py + 22, 10, 24);
  ctx.fillStyle = COLOR_SKIN;
  ctx.fillRect(px + 2, py + 44, 10, 6); // hand

  // Right arm (cols 36-46, rows 22-48)
  ctx.fillStyle = COLOR_BODY;
  ctx.fillRect(px + 36, py + 22, 10, 24);
  ctx.fillStyle = COLOR_SKIN;
  ctx.fillRect(px + 36, py + 44, 10, 6); // hand

  // Left leg (cols 10-23, rows 50-70)
  ctx.fillStyle = COLOR_PANTS;
  ctx.fillRect(px + 10, py + 50, 14, 20);

  // Right leg (cols 24-37, rows 50-70)
  ctx.fillStyle = COLOR_PANTS;
  ctx.fillRect(px + 24, py + 50, 14, 20);

  // Shoes
  ctx.fillStyle = COLOR_SHOE;
  ctx.fillRect(px + 8,  py + 70, 16, 8); // left shoe
  ctx.fillRect(px + 24, py + 70, 16, 8); // right shoe

  // --- Face composited on top of body ---
  // Face scale: FIGHTER_W = 48, face should be ~24px wide (FACE_W * scale = 16 * 1.5 ≈ 24)
  // Use scale=2 → 32px wide, centered horizontally in body
  const faceScale = 2;
  const faceDrawW = FACE_W * faceScale;
  const faceX = px + Math.floor((FIGHTER_W - faceDrawW) / 2);
  const faceY = py; // face starts at top of sprite
  drawFace(ctx, faceX, faceY, faceParams, faceScale);
}
