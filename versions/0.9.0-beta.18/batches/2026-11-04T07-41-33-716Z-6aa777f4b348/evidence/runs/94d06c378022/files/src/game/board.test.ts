import { describe, expect, it } from 'vitest';
import { BOARD_SIZES, MAX_SEED, generateDeck, parseBoardCode } from './board.ts';

describe('version 1 board codes', () => {
  it('matches independent literal shuffle vectors', () => {
    expect(generateDeck(4, 1)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(generateDeck(4, 2)).toEqual([2, 0, 1, 4, 7, 4, 5, 6, 5, 7, 2, 0, 3, 1, 3, 6]);
    expect(generateDeck(4, 739_806_647)).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
    expect(generateDeck(6, 7)).toEqual([
      4, 6, 1, 2, 3, 9, 11, 14, 14, 15, 16, 2, 17, 1, 7, 10, 3, 0,
      9, 10, 5, 12, 13, 17, 6, 11, 4, 15, 7, 8, 12, 16, 8, 5, 13, 0
    ]);
  });

  it('creates exactly two of every face at all supported sizes', () => {
    for (const size of BOARD_SIZES) {
      const deck = generateDeck(size, MAX_SEED);
      expect(deck).toHaveLength(size * size);
      for (let face = 0; face < deck.length / 2; face += 1) {
        expect(deck.filter((value) => value === face)).toHaveLength(2);
      }
    }
  });

  it('accepts only the exact canonical code', () => {
    expect(parseBoardCode('np1-4-1')?.deck).toEqual(generateDeck(4, 1));
    for (const text of [' np1-4-1', 'np1-4-1 ', 'np1-04-1', 'np1-4-01', 'np1-4-1\n', 'np2-4-1', 'np1-5-1', 'np1-4-0', 'np1-4-2147483647']) {
      expect(parseBoardCode(text)).toBeNull();
    }
  });
});
