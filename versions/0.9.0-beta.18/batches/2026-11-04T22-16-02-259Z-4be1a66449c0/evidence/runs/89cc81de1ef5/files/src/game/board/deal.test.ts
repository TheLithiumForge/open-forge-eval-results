import { describe, expect, it } from 'vitest';
import { createDeck, parseBoardCode } from './deal.ts';

describe('board codes and deals', () => {
  it('parses only the exact v1 code and supported range', () => {
    expect(parseBoardCode('np1-4-1')).toEqual({ boardCode: 'np1-4-1', size: 4, seed: 1 });
    expect(parseBoardCode('np1-16-2147483646')?.seed).toBe(2147483646);
    for (const code of [' np1-4-1', 'np1-4-01', 'np1-5-1', 'np1-4-0', 'np1-4-2147483647', 'np2-4-1']) {
      expect(parseBoardCode(code)).toBeNull();
    }
  });

  it('matches the independent Park-Miller and shuffle vector', () => {
    expect(createDeck(4, 1)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it('gives every generated face exactly two positions at all sizes', () => {
    for (const size of [4, 6, 8, 10, 12, 14, 16] as const) {
      const deck = createDeck(size, 12345);
      expect(deck).toHaveLength(size * size);
      expect(new Set(deck).size).toBe(deck.length / 2);
      for (const face of new Set(deck)) expect(deck.filter((value) => value === face)).toHaveLength(2);
    }
  });
});
