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
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {object} faceParams
 * @param {'idle'|'block'|'punch'|'kickCharge'|'kick'} [actionState='idle']
 */
export function drawBody(ctx, x, y, faceParams, actionState = 'idle') {
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

  // Arms — pose varies by action state
  if (actionState === 'block') {
    // Both arms raised forward to guard: crossed in front of torso, higher position
    ctx.fillStyle = COLOR_BODY;
    ctx.fillRect(px + 8,  py + 18, 10, 18); // left arm raised
    ctx.fillRect(px + 30, py + 18, 10, 18); // right arm raised
    ctx.fillStyle = COLOR_SKIN;
    ctx.fillRect(px + 8,  py + 34, 10, 6);  // left hand
    ctx.fillRect(px + 30, py + 34, 10, 6);  // right hand
  } else if (actionState === 'punch') {
    // Left arm hangs idle; right arm fully extended forward (kick direction)
    ctx.fillStyle = COLOR_BODY;
    ctx.fillRect(px + 2, py + 22, 10, 24);  // left arm (idle)
    ctx.fillRect(px + 36, py + 22, 20, 10); // right arm extended horizontally
    ctx.fillStyle = COLOR_SKIN;
    ctx.fillRect(px + 2, py + 44, 10, 6);   // left hand (idle)
    ctx.fillRect(px + 54, py + 22, 8, 10);  // right fist at tip of extension
  } else {
    // idle, kickCharge, kick: standard arm position
    ctx.fillStyle = COLOR_BODY;
    ctx.fillRect(px + 2,  py + 22, 10, 24); // left arm
    ctx.fillRect(px + 36, py + 22, 10, 24); // right arm
    ctx.fillStyle = COLOR_SKIN;
    ctx.fillRect(px + 2,  py + 44, 10, 6);  // left hand
    ctx.fillRect(px + 36, py + 44, 10, 6);  // right hand
  }

  // Legs — pose varies by action state
  if (actionState === 'kickCharge') {
    // Right leg raised/bent: knee lifted to waist height — kick preparation
    ctx.fillStyle = COLOR_PANTS;
    ctx.fillRect(px + 10, py + 50, 14, 20); // left leg normal
    ctx.fillRect(px + 24, py + 50, 14, 10); // right leg thigh only (bent up)
    ctx.fillRect(px + 30, py + 40, 10, 12); // right knee/shin angled up
    ctx.fillStyle = COLOR_SHOE;
    ctx.fillRect(px + 8,  py + 70, 16, 8);  // left shoe
    ctx.fillRect(px + 28, py + 36, 14, 8);  // right shoe raised
  } else if (actionState === 'kick') {
    // Right leg fully extended forward — kick strike
    ctx.fillStyle = COLOR_PANTS;
    ctx.fillRect(px + 10, py + 50, 14, 20); // left leg normal
    ctx.fillRect(px + 24, py + 50, 10, 8);  // right thigh stub
    ctx.fillRect(px + 34, py + 48, 20, 10); // right leg extended horizontally
    ctx.fillStyle = COLOR_SHOE;
    ctx.fillRect(px + 8,  py + 70, 16, 8);  // left shoe
    ctx.fillRect(px + 52, py + 46, 14, 10); // right shoe at extension tip
  } else {
    // idle, block, punch: standard leg position
    ctx.fillStyle = COLOR_PANTS;
    ctx.fillRect(px + 10, py + 50, 14, 20); // left leg
    ctx.fillRect(px + 24, py + 50, 14, 20); // right leg
    ctx.fillStyle = COLOR_SHOE;
    ctx.fillRect(px + 8,  py + 70, 16, 8);  // left shoe
    ctx.fillRect(px + 24, py + 70, 16, 8);  // right shoe
  }

  // --- Face composited on top of body ---
  // Face scale: FIGHTER_W = 48, face should be ~24px wide (FACE_W * scale = 16 * 1.5 ≈ 24)
  // Use scale=2 → 32px wide, centered horizontally in body
  const faceScale = 2;
  const faceDrawW = FACE_W * faceScale;
  const faceX = px + Math.floor((FIGHTER_W - faceDrawW) / 2);
  const faceY = py; // face starts at top of sprite
  drawFace(ctx, faceX, faceY, faceParams, faceScale);
}
