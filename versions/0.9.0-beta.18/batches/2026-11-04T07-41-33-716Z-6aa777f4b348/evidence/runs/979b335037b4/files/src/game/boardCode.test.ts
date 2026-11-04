import { describe, expect, it } from 'vitest';
import { createBoard, generateDeck, parseBoardCode, SIZES } from './boardCode.ts';

describe('version 1 deals (independent literal vectors)', () => {
  it('reproduces the specified seed 1 vector', () => {
    expect(createBoard('np1-4-1')?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });
  it('matches vectors computed independently with Python integer arithmetic', () => {
    expect(generateDeck(4, 2147483646)).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
    expect(generateDeck(6, 42)).toEqual([10, 14, 7, 2, 13, 14, 17, 0, 8, 16, 13, 7,
      5, 10, 11, 3, 15, 3, 9, 12, 9, 1, 4, 16, 8, 12, 1, 6, 15, 5, 17, 4, 0, 6, 11, 2]);
    // This seed's first draw is 2147483646: rejected at the first 16-way draw.
    expect(generateDeck(4, 739806647)).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
  });
  it.each(SIZES)('has precisely two of every face at size %i', size => {
    const deck = generateDeck(size, 123456);
    expect(deck).toHaveLength(size * size);
    for (let face = 0; face < size * size / 2; face++) {
      expect(deck.filter(value => value === face)).toHaveLength(2);
    }
    expect(Object.isFrozen(deck)).toBe(true);
  });
  it.each(['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', 'np1-5-1',
    'np2-4-1', ' np1-4-1', 'np1-4-1\n', 'np1-4-1.0', 'np1-4-1e2', '', null])('rejects %s', code => {
    expect(parseBoardCode(code)).toBeNull();
  });
});
