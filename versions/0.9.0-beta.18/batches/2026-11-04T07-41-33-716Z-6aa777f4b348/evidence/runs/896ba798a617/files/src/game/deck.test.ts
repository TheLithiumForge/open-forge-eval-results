import { describe, expect, it } from 'vitest';
import { parseBoardCode, SUPPORTED_SIZES } from './boardCode.ts';
import { parkMiller } from './deck.ts';
import { createGame } from './state.ts';

describe('version 1 generation', () => {
  it('matches the documented Park–Miller states', () => {
    let state = 1;
    const states = Array.from({ length: 5 }, () => { state = parkMiller(state); return state; });
    expect(states).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });
  it.each([
    ['np1-4-1', [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]],
    ['np1-4-2147483646', [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]],
    ['np1-6-42', [10, 14, 7, 2, 13, 14, 17, 0, 8, 16, 13, 7, 5, 10, 11, 3, 15, 3,
      9, 12, 9, 1, 4, 16, 8, 12, 1, 6, 15, 5, 17, 4, 0, 6, 11, 2]],
  ])('matches independent literal deck %s', (code, deck) => {
    // Additional literals were calculated with independent Python integer arithmetic.
    expect(createGame(String(code))?.deck).toEqual(deck);
  });
  it.each(SUPPORTED_SIZES)('contains exactly two of every face at size %i', (size) => {
    const state = createGame(`np1-${size}-2147483646`);
    expect(state?.deck).toHaveLength(size ** 2);
    for (let face = 0; face < size ** 2 / 2; face += 1) {
      expect(state?.deck.filter((value) => value === face)).toHaveLength(2);
    }
    expect(Object.isFrozen(state?.deck)).toBe(true);
    expect(Object.isFrozen(state?.board)).toBe(true);
  });
  it.each(['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', 'np2-4-1',
    'np1-5-1', ' np1-4-1', 'np1-4-1 ', 'np1-4-1\n', 'np1-4-1.0', 'np1-4-+1', 'np1-4-1e2'])
  ('rejects noncanonical code %j', (code) => expect(parseBoardCode(code)).toBeNull());
});
