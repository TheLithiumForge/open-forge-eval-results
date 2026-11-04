import { describe, expect, test } from 'vitest';
import { createBoard, generateDeck, parseBoardCode, SIZES } from './boardCode.ts';

describe('version 1 deals', () => {
  test('matches the published independent vector', () => {
    expect(createBoard('np1-4-1')?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });
  test('matches independent Python integer vectors at another size and the seed limit', () => {
    expect(generateDeck(4, 2147483646)).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
    expect(generateDeck(6, 12345)).toEqual([17, 2, 2, 16, 17, 8, 1, 10, 13, 4, 0, 6, 0, 8, 4, 12, 7, 11,
      10, 14, 9, 13, 3, 6, 5, 3, 11, 16, 12, 15, 9, 1, 15, 5, 14, 7]);
  });
  test('rejection sampling discards an out-of-limit draw before shuffling', () => {
    // This seed's first generator state is 2147483646, rejected for bound 16.
    expect(generateDeck(4, 739806647)).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
  });
  test.each(SIZES)('%i has exactly two of every face and an immutable deck', size => {
    const board = createBoard(`np1-${size}-1`);
    expect(board?.deck).toHaveLength(size * size);
    for (let face = 0; face < size * size / 2; face++) expect(board?.deck.filter(id => id === face)).toHaveLength(2);
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(board?.deck)).toBe(true);
  });
  test.each(['np1-4-0', 'np1-4-01', 'np1-04-1', 'np1-5-1', 'np2-4-1', 'np1-4-2147483647',
    'np1-4-1\n', ' np1-4-1', 'np1-4-+1', 'np1-4-1.0', 'np1-4-1e2', 'np1-4-99999999999999999999999'])('rejects %j', code => {
    expect(parseBoardCode(code)).toBeNull();
  });
});
