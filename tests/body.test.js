import { describe, it, expect, vi } from 'vitest';
import { drawBody } from '../src/art/body.js';

// Minimal canvas 2D context mock sufficient for pixel-art draw calls.
function makeCtxMock() {
  return {
    imageSmoothingEnabled: true,
    fillStyle: '',
    fillRect: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn((w, h) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    })),
  };
}

// Minimal faceParams that satisfies generateFacePixels without errors.
const FACE_PARAMS = {
  skinTone: '#F5C5A3',
  hairStyle: 'short',
  hairColor: '#3B2006',
  eyeColor: '#4B3621',
  beard: false,
};

describe('drawBody — action state rendering', () => {
  it('idle: renders without error', () => {
    const ctx = makeCtxMock();
    expect(() => drawBody(ctx, 100, 200, FACE_PARAMS, 'idle')).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('default (no actionState): renders without error (backward-compat)', () => {
    const ctx = makeCtxMock();
    expect(() => drawBody(ctx, 100, 200, FACE_PARAMS)).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('block: renders without error', () => {
    const ctx = makeCtxMock();
    expect(() => drawBody(ctx, 100, 200, FACE_PARAMS, 'block')).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('punch: renders without error', () => {
    const ctx = makeCtxMock();
    expect(() => drawBody(ctx, 100, 200, FACE_PARAMS, 'punch')).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('kickCharge: renders without error', () => {
    const ctx = makeCtxMock();
    expect(() => drawBody(ctx, 100, 200, FACE_PARAMS, 'kickCharge')).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('kick: renders without error', () => {
    const ctx = makeCtxMock();
    expect(() => drawBody(ctx, 100, 200, FACE_PARAMS, 'kick')).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});
