import { describe, expect, it } from 'vitest';
import { createGame } from './createGame.ts';
import { nextRandomState } from './deck.ts';
import { SUPPORTED_SIZES } from './boardCode.ts';

describe('fixed generation algorithm', () => {
  it('matches the published Park-Miller literal states', () => {
    let state = 1;
    for (const expected of [16807, 282475249, 1622650073, 984943658, 1144108930]) {
      state = nextRandomState(state);
      expect(state).toBe(expected);
    }
  });

  it('matches independent literal shuffled vectors', () => {
    expect(createGame('np1-4-1')?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(createGame('np1-4-2147483646')?.deck).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
    // This seed first produces 2147483646, forcing rejection at the 16-way draw.
    expect(createGame('np1-4-739806647')?.deck).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
    expect(createGame('np1-6-123456')?.deck).toEqual([
      12, 5, 4, 14, 10, 15, 16, 7, 16, 9, 3, 8, 1, 13, 17, 2, 6, 8,
      11, 15, 2, 0, 4, 9, 13, 14, 3, 7, 17, 12, 10, 6, 11, 1, 0, 5,
    ]);
  });

  it('creates two of every face at every supported size without mutable decks', () => {
    for (const size of SUPPORTED_SIZES) {
      const game = createGame(`np1-${size}-1`);
      expect(game).not.toBeNull();
      if (!game) throw new Error('Missing game.');
      expect(game.deck).toHaveLength(size * size);
      expect(Object.isFrozen(game.deck)).toBe(true);
      expect(Object.isFrozen(game.board)).toBe(true);
      for (let face = 0; face < size * size / 2; face += 1) {
        expect(game.deck.filter(value => value === face)).toHaveLength(2);
      }
    }
  });
});
