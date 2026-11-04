import { describe, expect, it } from 'vitest';
import { parseBoardCode } from './boardCode.ts';
import { generateDeck } from './generateDeck.ts';
import { GRID_SIZES } from './sizes.ts';

describe('board codes and deals', () => {
  it('matches the independent version 1 seed vector', () => {
    expect(generateDeck('np1-4-1')).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it('parses only canonical supported codes', () => {
    expect(parseBoardCode('np1-16-2147483646')?.size).toBe(16);
    for (const code of [' np1-4-1', 'np1-4-01', 'np1-5-1', 'np1-4-0', 'np1-4-2147483647', 'np2-4-1']) {
      expect(parseBoardCode(code)).toBeNull();
    }
  });

  it('deals two copies of each face at every supported size', () => {
    for (const size of GRID_SIZES) {
      const deck = generateDeck(`np1-${size}-12345`);
      expect(deck).toHaveLength(size * size);
      for (let face = 0; face < (size * size) / 2; face += 1) {
        expect(deck?.filter((value) => value === face)).toHaveLength(2);
      }
    }
  });
});
