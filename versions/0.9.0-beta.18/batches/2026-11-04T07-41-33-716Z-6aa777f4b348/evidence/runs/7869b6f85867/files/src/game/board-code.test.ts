import { describe, expect, it } from 'vitest';
import { generateBoard, nextRandom, parseBoardCode, SIZES } from './board-code.ts';

describe('version 1 generation (D01–D04)', () => {
  it('matches the published Park–Miller states', () => {
    let state = 1;
    expect(Array.from({ length: 5 }, () => (state = nextRandom(state))))
      .toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });
  it('matches the published deck', () => {
    expect(generateBoard('np1-4-1').deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });
  it('matches an independently calculated 6x6 vector', () => {
    expect(generateBoard('np1-6-42').deck).toEqual([
      10, 14, 7, 2, 13, 14, 17, 0, 8, 16, 13, 7, 5, 10, 11, 3, 15, 3,
      9, 12, 9, 1, 4, 16, 8, 12, 1, 6, 15, 5, 17, 4, 0, 6, 11, 2,
    ]);
  });
  it('rejects a biased random draw before shuffling', () => {
    // The first draw is 2147483646, outside the accepted range for 16 results.
    expect(nextRandom(739806647)).toBe(2147483646);
    expect(generateBoard('np1-4-739806647').deck)
      .toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
  });
  it.each(SIZES)('has exactly two of each face at size %i', size => {
    const board = generateBoard(`np1-${size}-2147483646`);
    expect(board.deck).toHaveLength(size * size);
    for (let id = 0; id < size * size / 2; id++) expect(board.deck.filter(face => face === id)).toHaveLength(2);
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(board.deck)).toBe(true);
  });
  it.each(['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', 'np1-5-1',
    'np2-4-1', 'np1-4-+1', 'np1-4-1.0', 'np1-4-1\n', ' np1-4-1', 'np1-4-1 ',
    'np1-4-1e2', 'np1-4-99999999999999999999', ''])('rejects noncanonical code %j', code => {
    expect(parseBoardCode(code)).toBeNull();
  });
});
