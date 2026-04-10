import { describe, it, expect } from 'vitest';
import { applyPhysics, clampToBounds, preventOverlap, GRAVITY, CANVAS_W } from '../src/engine/physics.js';
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

describe('preventOverlap', () => {
  it('pushes two grounded fighters apart when they overlap', () => {
    // Both fighters on the ground, overlapping in x
    const f1 = makeFighter({ x: 200, vy: 0 }); // y = GROUND_Y - FIGHTER_H (grounded)
    const f2 = makeFighter({ x: 220, vy: 0 }); // overlaps by FIGHTER_W - 20 pixels
    const [r1, r2] = preventOverlap(f1, f2);
    expect(r1.x).toBeLessThan(f1.x);
    expect(r2.x).toBeGreaterThan(f2.x);
  });

  it('allows overlap (no push) when the jumping fighter is airborne', () => {
    // f1 is in the air (vy !== 0), f2 is grounded — overlap should be ignored
    const groundedY = GROUND_Y - FIGHTER_H;
    const f1 = makeFighter({ x: 200, vy: -10, y: groundedY - 50 }); // airborne
    const f2 = makeFighter({ x: 220, vy: 0, y: groundedY });
    const [r1, r2] = preventOverlap(f1, f2);
    expect(r1.x).toBe(f1.x);
    expect(r2.x).toBe(f2.x);
  });

  it('re-applies overlap prevention once both fighters are grounded after a jump', () => {
    // Both fighters grounded again after the jump — overlap must be prevented
    const groundedY = GROUND_Y - FIGHTER_H;
    const f1 = makeFighter({ x: 200, vy: 0, y: groundedY });
    const f2 = makeFighter({ x: 220, vy: 0, y: groundedY });
    const [r1, r2] = preventOverlap(f1, f2);
    // Fighters should be separated again
    expect(r1.x + FIGHTER_W).toBeLessThanOrEqual(r2.x + 1); // allow rounding tolerance
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
