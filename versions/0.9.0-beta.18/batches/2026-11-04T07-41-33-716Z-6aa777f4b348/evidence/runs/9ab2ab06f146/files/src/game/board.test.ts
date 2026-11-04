import { describe, expect, it } from 'vitest';
import { createBoard, generateDeck, nextRandom, parseBoardCode, SIZES } from './board.ts';

describe('version 1 board generation', () => {
  it('matches the independent published generator and deck vectors', () => {
    let state = 1;
    expect(Array.from({ length: 5 }, () => (state = nextRandom(state))))
      .toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
    expect(createBoard('np1-4-1')?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });
  it('matches an independent rejection vector, whose first draw is 2147483646', () => {
    // Seed derived with modular inversion; literal shuffle checked separately in Python.
    expect(nextRandom(739806647)).toBe(2147483646);
    expect(createBoard('np1-4-739806647')?.deck)
      .toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
  });
  it.each(SIZES)('deals exactly two of each face at size %i', size => {
    const deck = generateDeck(size, 2147483646);
    expect(deck).toHaveLength(size * size);
    for (let face = 0; face < size * size / 2; face++) expect(deck.filter(value => value === face)).toHaveLength(2);
    expect(generateDeck(size, 2147483646)).toEqual(deck);
    expect(Object.isFrozen(deck)).toBe(true);
  });
  it.each([' np1-4-1', 'np1-4-1\n', 'np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647',
    'np2-4-1', 'np1-5-1', 'np1-4-1e2', 'np1-4-+1', 'np1-4-1.0', 'np1-4-99999999999999999'])('rejects %s', code => {
    expect(parseBoardCode(code)).toBeNull();
  });
  it('accepts both seed boundaries', () => {
    expect(parseBoardCode('np1-16-2147483646')).toEqual({ size: 16, seed: 2147483646 });
    expect(parseBoardCode('np1-4-1')).toEqual({ size: 4, seed: 1 });
  });
});
