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

/**
 * Returns true when the fighter is currently airborne (not on the ground).
 * A fighter is airborne when its y position is above the resting ground position,
 * or when it has non-zero vertical velocity (ascending jump).
 */
function isAirborne(fighter) {
  return fighter.y < fighter.groundY - FIGHTER_H || fighter.vy !== 0;
}

/**
 * Prevents two fighters from occupying overlapping x-space.
 * When sprites overlap, each fighter is pushed apart by half the overlap distance.
 * Overlap is only prevented when BOTH fighters are on the ground — if either is
 * airborne, the fighters may pass through each other (jump-over allowed).
 * Returns [f1, f2] with adjusted x positions.
 */
export function preventOverlap(f1, f2) {
  // Allow pass-through when either fighter is in the air
  if (isAirborne(f1) || isAirborne(f2)) return [f1, f2];

  const f1Right = f1.x + FIGHTER_W;
  const f2Right = f2.x + FIGHTER_W;

  if (f1.x < f2Right && f2.x < f1Right) {
    const overlap = Math.min(f1Right - f2.x, f2Right - f1.x);
    const half = overlap / 2;

    if (f1.x < f2.x) {
      // f1 is to the left — push f1 left, f2 right
      return [
        clampToBounds({ ...f1, x: f1.x - half }),
        clampToBounds({ ...f2, x: f2.x + half }),
      ];
    } else {
      // f2 is to the left — push f2 left, f1 right
      return [
        clampToBounds({ ...f1, x: f1.x + half }),
        clampToBounds({ ...f2, x: f2.x - half }),
      ];
    }
  }

  return [f1, f2];
}
