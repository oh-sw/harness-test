import { describe, it, expect } from 'vitest';
import { createFighter, applyMovement, applyJump, FIGHTER_H, JUMP_VY, MAX_HP } from '../src/engine/fighter.js';
import { stepFighter } from '../src/engine/physics.js';

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

describe('createFighter', () => {
  it('places fighter with bottom of sprite at groundY', () => {
    const f = makeFighter();
    expect(f.y).toBe(GROUND_Y - FIGHTER_H);
  });

  it('initialises hp to MAX_HP', () => {
    const f = makeFighter();
    expect(f.hp).toBe(MAX_HP);
  });

  it('initialises vy to 0', () => {
    const f = makeFighter();
    expect(f.vy).toBe(0);
  });
});

describe('applyMovement', () => {
  it('increases x when dx is positive (move right)', () => {
    const f = makeFighter({ x: 400 });
    const next = applyMovement(f, 5);
    expect(next.x).toBe(405);
  });

  it('decreases x when dx is negative (move left)', () => {
    const f = makeFighter({ x: 400 });
    const next = applyMovement(f, -5);
    expect(next.x).toBe(395);
  });

  it('does not mutate the original fighter', () => {
    const f = makeFighter({ x: 400 });
    applyMovement(f, 10);
    expect(f.x).toBe(400);
  });
});

describe('applyJump', () => {
  it('sets vy to JUMP_VY when grounded', () => {
    const f = makeFighter(); // y is groundY - FIGHTER_H (grounded)
    const next = applyJump(f);
    expect(next.vy).toBe(JUMP_VY);
  });

  it('does not allow double jump (ignores jump when airborne)', () => {
    const f = makeFighter({ y: 200, vy: JUMP_VY }); // mid-air
    const next = applyJump(f);
    expect(next.vy).toBe(JUMP_VY); // unchanged
  });
});

describe('jump arc integration', () => {
  it('vy decreases (approaches 0 then positive) during jump arc', () => {
    let f = makeFighter();
    f = applyJump(f);
    expect(f.vy).toBe(JUMP_VY); // negative → going up

    // Step a few frames and confirm vy increases each frame
    let prev = f.vy;
    for (let i = 0; i < 5; i++) {
      f = stepFighter(f);
      expect(f.vy).toBeGreaterThan(prev);
      prev = f.vy;
    }
  });

  it('returns to ground after jump', () => {
    let f = makeFighter();
    f = applyJump(f);
    const groundedY = GROUND_Y - FIGHTER_H;

    // Run physics until grounded (max 60 frames for safety)
    for (let i = 0; i < 60; i++) {
      f = stepFighter(f);
      if (f.y === groundedY && f.vy === 0) break;
    }

    expect(f.y).toBe(groundedY);
    expect(f.vy).toBe(0);
  });
});
