import { describe, expect, it } from 'vitest';
import { generateBoard, parseBoardCode } from './deal.ts';

describe('version 1 board codes', () => {
  it('matches independent literal decks including the documented example', () => {
    const vectors = [
      ['np1-4-1', [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]],
      ['np1-4-2', [2, 0, 1, 4, 7, 4, 5, 6, 5, 7, 2, 0, 3, 1, 3, 6]],
      ['np1-4-2147483646', [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]],
      ['np1-4-739806647', [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]],
    ] as const;
    for (const [code, deck] of vectors) {
      const parsed = parseBoardCode(code);
      expect(parsed).not.toBeNull();
      if (parsed !== null) expect(generateBoard(parsed).deck).toEqual(deck);
    }
  });

  it('supports each size with exactly two of every face', () => {
    for (const side of [4, 6, 8, 10, 12, 14, 16]) {
      const parsed = parseBoardCode(`np1-${side}-1`);
      expect(parsed).not.toBeNull();
      if (parsed !== null) {
        const deck = generateBoard(parsed).deck;
        expect(deck).toHaveLength(side * side);
        expect(new Set(deck).size).toBe(side * side / 2);
        for (const face of new Set(deck)) expect(deck.filter((card) => card === face)).toHaveLength(2);
      }
    }
  });

  it('rejects whitespace, leading zeroes, unsupported sides and out of range seeds', () => {
    for (const code of [' np1-4-1', 'np1-4-1 ', 'np1-4-1\n', 'np1-4-1\r', 'np1-04-1', 'np1-4-0', 'np1-4-01',
      'np1-4-2147483647', 'np1-5-1', 'np2-4-1']) expect(parseBoardCode(code)).toBeNull();
  });
});
