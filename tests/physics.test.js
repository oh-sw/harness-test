import { describe, it, expect } from 'vitest';
import { applyPhysics, clampToBounds, GRAVITY, CANVAS_W } from '../src/engine/physics.js';
import { createFighter, FIGHTER_W, FIGHTER_H, JUMP_VY } from '../src/engine/fighter.js';

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

describe('applyPhysics', () => {
  it('increases vy by GRAVITY each frame when airborne', () => {
    const f = makeFighter({ vy: -10, y: 300 });
    const next = applyPhysics(f);
    expect(next.vy).toBeCloseTo(-10 + GRAVITY);
  });

  it('moves y downward when vy is positive (falling)', () => {
    const f = makeFighter({ vy: 5, y: 300 });
    const next = applyPhysics(f);
    expect(next.y).toBeGreaterThan(f.y);
  });

  it('clamps y to ground and zeroes vy on ground collision', () => {
    // Put fighter just above ground so gravity pushes it through
    const groundY = GROUND_Y - FIGHTER_H; // actual resting y
    const f = makeFighter({ vy: 10, y: groundY - 2 });
    const next = applyPhysics(f);
    expect(next.y).toBe(groundY);
    expect(next.vy).toBe(0);
  });

  it('fighter resting on ground remains on ground', () => {
    const groundY = GROUND_Y - FIGHTER_H;
    const f = makeFighter({ vy: 0, y: groundY });
    const next = applyPhysics(f);
    expect(next.y).toBe(groundY);
    expect(next.vy).toBe(0);
  });

  it('negative vy (ascending jump) moves y upward', () => {
    const f = makeFighter({ vy: JUMP_VY, y: 400 });
    const next = applyPhysics(f);
    expect(next.y).toBeLessThan(f.y);
  });
});

describe('clampToBounds', () => {
  it('clamps x below 0 to 0', () => {
    const f = makeFighter({ x: -20 });
    expect(clampToBounds(f).x).toBe(0);
  });

  it('clamps x above canvas right edge', () => {
    const f = makeFighter({ x: CANVAS_W });
    expect(clampToBounds(f).x).toBe(CANVAS_W - FIGHTER_W);
  });

  it('does not change x when within bounds', () => {
    const f = makeFighter({ x: 400 });
    expect(clampToBounds(f).x).toBe(400);
  });
});
