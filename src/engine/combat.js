// Combat logic: attack resolution, motion timers, block rules.
// Pure functions — no DOM dependency, time is injected via `now` param.

import { FIGHTER_W } from './fighter.js';

export const ATTACK_DAMAGE = 1;
export const MOTION_DURATION = 500;   // ms — attack motion lock window
export const KICK_CHARGE_DURATION = 500; // ms — kick preparation delay

// Punch reach in pixels (horizontal overlap considered a hit)
const PUNCH_REACH = 80;
// Kick reach is slightly longer
const KICK_REACH = 100;

/**
 * Returns true when the attacker is coming from the front (the side the defender faces).
 * Blocking a punch only works from the front.
 * Uses the defender's `facingRight` flag which is set at creation time (no auto-facing).
 */
export function isFacingOpponent(attacker, defender) {
  // Defender faces right → front side is to their right (attacker must be to the right)
  // Defender faces left  → front side is to their left (attacker must be to the left)
  if (defender.facingRight) {
    return attacker.x > defender.x;
  } else {
    return attacker.x < defender.x;
  }
}

/**
 * Returns true when the two fighters are close enough for the given attack type to land,
 * AND the defender is on the side the attacker is facing.
 * This prevents hitting enemies behind you.
 */
function inRange(attacker, defender, attackType) {
  const reach = attackType === 'kick' ? KICK_REACH : PUNCH_REACH;
  const dist = Math.abs(attacker.x - defender.x);
  if (dist > FIGHTER_W + reach) return false;

  // Defender must be in the direction the attacker is facing
  if (attacker.facingRight) {
    return defender.x > attacker.x;
  } else {
    return defender.x < attacker.x;
  }
}

/**
 * Returns true when the defender's blocking state should absorb the incoming attack.
 * Kick is never blocked. Punch is only blocked when coming from the front.
 */
export function isBlocking(defender, attacker, attackType) {
  if (!defender.blocking) return false;
  if (attackType === 'kick') return false; // kick cannot be blocked
  // Punch is only blockable from the front
  return isFacingOpponent(attacker, defender);
}

/**
 * Resolves one attack against a defender.
 * Returns [nextAttacker, nextDefender] with updated hp / attackState.
 * The attack only fires when the attacker is in an active attack motion
 * AND the motionEndTime has not elapsed yet.
 * hitConfirmed prevents the same motion from dealing damage more than once.
 */
export function resolveAttack(attacker, defender, now) {
  if (!attacker.attackState) return [attacker, defender];
  if (now > attacker.motionEndTime) return [attacker, defender];
  // Damage already applied for this motion — skip to avoid per-frame repeat
  if (attacker.hitConfirmed) return [attacker, defender];
  if (!inRange(attacker, defender, attacker.attackState)) return [attacker, defender];

  const blocked = isBlocking(defender, attacker, attacker.attackState);
  if (blocked) return [attacker, defender];

  const nextAttacker = { ...attacker, hitConfirmed: true };
  const nextDefender = { ...defender, hp: Math.max(0, defender.hp - ATTACK_DAMAGE) };
  return [nextAttacker, nextDefender];
}

/**
 * Starts a punch: sets attackState and locks input for MOTION_DURATION ms.
 */
export function startPunch(fighter, now) {
  if (fighter.inputLocked) return fighter;
  return {
    ...fighter,
    attackState: 'punch',
    motionEndTime: now + MOTION_DURATION,
    inputLocked: true,
    hitConfirmed: false,
  };
}

/**
 * Starts the kick charge phase (kickCharging = true, kickChargeStartTime = now).
 * The kick is not yet active — call updateKickCharge each frame to auto-fire it.
 */
export function startKickCharge(fighter, now) {
  if (fighter.inputLocked) return fighter;
  if (fighter.kickCharging) return fighter; // already charging
  return {
    ...fighter,
    kickCharging: true,
    kickChargeStartTime: now,
    inputLocked: true, // lock input during charge + motion
  };
}

/**
 * Called every frame for a fighter that is kick-charging.
 * When KICK_CHARGE_DURATION has elapsed, transitions to the active kick motion.
 */
export function updateKickCharge(fighter, now) {
  if (!fighter.kickCharging) return fighter;
  if (now - fighter.kickChargeStartTime < KICK_CHARGE_DURATION) return fighter;

  // Charge complete → fire kick
  return {
    ...fighter,
    kickCharging: false,
    attackState: 'kick',
    motionEndTime: now + MOTION_DURATION,
    hitConfirmed: false,
    // inputLocked stays true through kick motion
  };
}

/**
 * Called every frame: clears the attack motion and unlocks input once the motion window closes.
 * Resets hitConfirmed so the next attack starts clean.
 */
export function updateMotion(fighter, now) {
  if (!fighter.attackState) return fighter;
  if (now < fighter.motionEndTime) return fighter;

  return {
    ...fighter,
    attackState: null,
    inputLocked: false,
    hitConfirmed: false,
  };
}
