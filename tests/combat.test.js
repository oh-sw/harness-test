import { describe, it, expect } from 'vitest';
import { resolveAttack, startPunch, MOTION_DURATION, ATTACK_DAMAGE } from '../src/engine/combat.js';
import { createFighter, MAX_HP, FIGHTER_W } from '../src/engine/fighter.js';

const GROUND_Y = 600;

function makeFighter(overrides = {}) {
  const base = createFighter({
    characterId: 'test',
    faceParams: {},
    x: 400,
    groundY: GROUND_Y,
  });
  return { ...base, ...overrides };
}

const NOW = 1000;

describe('resolveAttack — direction-based hit detection', () => {
  it('punch lands when attacker faces right and defender is to the right', () => {
    const attacker = makeFighter({
      x: 300,
      facingRight: true,
      attackState: 'punch',
      motionEndTime: NOW + MOTION_DURATION,
      hitConfirmed: false,
      inputLocked: true,
    });
    const defender = makeFighter({ x: 340, hp: MAX_HP, blocking: false });

    const [, nextDefender] = resolveAttack(attacker, defender, NOW);
    expect(nextDefender.hp).toBe(MAX_HP - ATTACK_DAMAGE);
  });

  it('punch does NOT land when attacker faces right but defender is to the left', () => {
    const attacker = makeFighter({
      x: 400,
      facingRight: true,
      attackState: 'punch',
      motionEndTime: NOW + MOTION_DURATION,
      hitConfirmed: false,
      inputLocked: true,
    });
    const defender = makeFighter({ x: 340, hp: MAX_HP, blocking: false });

    const [, nextDefender] = resolveAttack(attacker, defender, NOW);
    expect(nextDefender.hp).toBe(MAX_HP);
  });

  it('kick does NOT land when attacker faces right but defender is to the left', () => {
    const attacker = makeFighter({
      x: 400,
      facingRight: true,
      attackState: 'kick',
      motionEndTime: NOW + MOTION_DURATION,
      hitConfirmed: false,
      inputLocked: true,
    });
    const defender = makeFighter({ x: 340, hp: MAX_HP, blocking: false });

    const [, nextDefender] = resolveAttack(attacker, defender, NOW);
    expect(nextDefender.hp).toBe(MAX_HP);
  });
});
