import { describe, it, expect } from 'vitest';
import { CHARACTERS } from '../src/characters.js';
import { generateFacePixels, FACE_W, FACE_H } from '../src/art/face.js';
import { selectReducer, INITIAL_SELECT_STATE } from '../src/screens/select.js';

describe('CHARACTERS data', () => {
  it('has exactly 5 characters', () => {
    expect(CHARACTERS).toHaveLength(5);
  });

  it('names match 현재/재현/상우/한결/중훈 in order', () => {
    const names = CHARACTERS.map((c) => c.name);
    expect(names).toEqual(['현재', '재현', '상우', '한결', '중훈']);
  });

  it('each character has a numeric seed', () => {
    for (const char of CHARACTERS) {
      expect(typeof char.seed).toBe('number');
    }
  });

  it('each character has the required faceParams fields', () => {
    const REQUIRED = ['skinTone', 'hairStyle', 'hairColor', 'eyeColor', 'beard'];
    for (const char of CHARACTERS) {
      expect(char.faceParams).toBeDefined();
      for (const field of REQUIRED) {
        expect(char.faceParams[field], `${char.name} missing faceParams.${field}`).toBeDefined();
      }
    }
  });

  it('all character ids are unique', () => {
    const ids = CHARACTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('generateFacePixels determinism', () => {
  it('returns an array of FACE_W * FACE_H elements', () => {
    const pixels = generateFacePixels(CHARACTERS[0].faceParams);
    expect(pixels).toHaveLength(FACE_W * FACE_H);
  });

  it('produces identical output for the same faceParams (deterministic)', () => {
    for (const char of CHARACTERS) {
      const first = generateFacePixels(char.faceParams);
      const second = generateFacePixels(char.faceParams);
      expect(first).toEqual(second);
    }
  });

  it('produces different output for different characters', () => {
    // At least one pixel should differ between the first two characters
    const a = generateFacePixels(CHARACTERS[0].faceParams);
    const b = generateFacePixels(CHARACTERS[1].faceParams);
    const different = a.some((pixel, i) => pixel !== b[i]);
    expect(different).toBe(true);
  });

  it('all five characters produce distinct pixel arrays', () => {
    const pixelSets = CHARACTERS.map((c) => generateFacePixels(c.faceParams));
    for (let i = 0; i < pixelSets.length; i++) {
      for (let j = i + 1; j < pixelSets.length; j++) {
        const same = pixelSets[i].every((p, idx) => p === pixelSets[j][idx]);
        expect(same, `Characters ${i} and ${j} produced identical pixels`).toBe(false);
      }
    }
  });
});

describe('selectReducer', () => {
  it('initial state has p1 and p2 as null', () => {
    expect(INITIAL_SELECT_STATE).toEqual({ p1: null, p2: null });
  });

  it('SELECT_1P updates p1', () => {
    const state = selectReducer(INITIAL_SELECT_STATE, {
      type: 'SELECT_1P',
      characterId: 'hyunjae',
    });
    expect(state.p1).toBe('hyunjae');
    expect(state.p2).toBeNull();
  });

  it('SELECT_2P updates p2', () => {
    const state = selectReducer(INITIAL_SELECT_STATE, {
      type: 'SELECT_2P',
      characterId: 'jaehyun',
    });
    expect(state.p2).toBe('jaehyun');
    expect(state.p1).toBeNull();
  });

  it('sequential selections accumulate correctly', () => {
    let state = INITIAL_SELECT_STATE;
    state = selectReducer(state, { type: 'SELECT_1P', characterId: 'sangwoo' });
    state = selectReducer(state, { type: 'SELECT_2P', characterId: 'hangyeol' });
    expect(state).toEqual({ p1: 'sangwoo', p2: 'hangyeol' });
  });

  it('changing 1P selection overwrites previous 1P choice', () => {
    let state = selectReducer(INITIAL_SELECT_STATE, {
      type: 'SELECT_1P',
      characterId: 'hyunjae',
    });
    state = selectReducer(state, { type: 'SELECT_1P', characterId: 'junghun' });
    expect(state.p1).toBe('junghun');
  });

  it('unknown action type returns state unchanged', () => {
    const state = selectReducer(INITIAL_SELECT_STATE, { type: 'UNKNOWN' });
    expect(state).toEqual(INITIAL_SELECT_STATE);
  });

  it('does not mutate the previous state', () => {
    const prev = { p1: 'hyunjae', p2: null };
    const next = selectReducer(prev, { type: 'SELECT_1P', characterId: 'sangwoo' });
    expect(prev.p1).toBe('hyunjae'); // unchanged
    expect(next.p1).toBe('sangwoo');
  });
});
