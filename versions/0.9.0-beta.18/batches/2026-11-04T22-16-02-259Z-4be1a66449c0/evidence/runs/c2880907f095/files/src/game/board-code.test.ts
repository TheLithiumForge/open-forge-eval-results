import { describe, expect, it } from 'vitest';
import { generateDeck, parseBoardCode } from './board-code';

describe('board codes', () => {
  it('matches the literal version 1 deck vector', () => {
    expect(parseBoardCode('np1-4-1')?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it('creates complete pairs for every supported size', () => {
    for (const size of [4, 6, 8, 10, 12, 14, 16] as const) {
      const deck = generateDeck(size, 12_345);
      expect(deck).toHaveLength(size * size);
      expect([...new Set(deck)]).toHaveLength(size * size / 2);
      for (const face of new Set(deck)) expect(deck.filter((value) => value === face)).toHaveLength(2);
    }
  });

  it('accepts only canonical codes with supported dimensions and bounded seeds', () => {
    for (const code of ['np1-4-0', 'np1-4-01', 'np1-5-1', 'np1-4-2147483647', 'np2-4-1', ' np1-4-1']) {
      expect(parseBoardCode(code)).toBeNull();
    }
    expect(parseBoardCode('np1-16-2147483646')?.size).toBe(16);
  });
});
