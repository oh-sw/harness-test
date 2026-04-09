import { describe, it, expect } from 'vitest';
import { GAME_TITLE } from '../src/main.js';

describe('smoke', () => {
  it('GAME_TITLE is exported and non-empty', () => {
    expect(typeof GAME_TITLE).toBe('string');
    expect(GAME_TITLE.length).toBeGreaterThan(0);
  });
});
