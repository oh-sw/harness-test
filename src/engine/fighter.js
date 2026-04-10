// Fighter state factory and update helpers.
// Pure functions — no DOM/canvas dependency so they are fully testable in Node.

export const FIGHTER_W = 48;
export const FIGHTER_H = 80;
export const MOVE_SPEED = 5;
export const JUMP_VY = -15;
export const MAX_HP = 10;

/**
 * Creates the initial state for a fighter.
 * @param {object} opts
 * @param {string} opts.characterId
 * @param {object} opts.faceParams
 * @param {number} opts.x  - Initial x (left edge of sprite)
 * @param {number} opts.groundY - Y coordinate of the ground line (bottom of sprite)
 */
export function createFighter({ characterId, faceParams, x, groundY, facingRight = true }) {
  return {
    characterId,
    faceParams,
    x,
    y: groundY - FIGHTER_H,
    vy: 0,
    hp: MAX_HP,
    groundY,
    facingRight,
    blocking: false,
    kickCharging: false,
    kickChargeStartTime: 0,
    attackState: null,   // 'punch' | 'kick' | null
    motionEndTime: 0,
    inputLocked: false,
    hitConfirmed: false, // prevents the same motion from dealing damage more than once
  };
}

/**
 * Returns a new fighter state after applying horizontal movement.
 * dx is the signed pixel delta for this frame.
 */
export function applyMovement(fighter, dx) {
  return { ...fighter, x: fighter.x + dx };
}

/**
 * Returns a new fighter state with a jump applied (only if grounded).
 */
export function applyJump(fighter) {
  const grounded = fighter.y >= fighter.groundY - FIGHTER_H;
  if (!grounded) return fighter;
  return { ...fighter, vy: JUMP_VY };
}
