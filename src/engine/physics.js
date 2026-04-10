// Physics: gravity, ground collision, boundary clamping.
// Pure functions — no side effects, no DOM dependency.

import { FIGHTER_W, FIGHTER_H } from './fighter.js';

export const GRAVITY = 0.8;
export const CANVAS_W = 1280;

/**
 * Applies one frame of physics to a fighter state.
 * Returns a new fighter state with updated y and vy.
 */
export function applyPhysics(fighter) {
  let vy = fighter.vy + GRAVITY;
  let y = fighter.y + vy;

  // Ground collision
  const groundY = fighter.groundY - FIGHTER_H;
  if (y >= groundY) {
    y = groundY;
    vy = 0;
  }

  return { ...fighter, y, vy };
}

/**
 * Clamps a fighter's x position so the sprite stays within canvas bounds.
 * Returns a new fighter state.
 */
export function clampToBounds(fighter) {
  const minX = 0;
  const maxX = CANVAS_W - FIGHTER_W;
  const x = Math.max(minX, Math.min(maxX, fighter.x));
  return { ...fighter, x };
}

/**
 * Applies physics and boundary clamping in one step.
 */
export function stepFighter(fighter) {
  return clampToBounds(applyPhysics(fighter));
}
