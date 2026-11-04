import { describe, expect, it } from 'vitest';
import { parseBoardCode, SIZES } from './boardCode.ts';
import { nextRandom } from './deck.ts';
import { createGame } from './state.ts';

describe('version 1 board codes and independent generation vectors', () => {
  it('uses the documented Park–Miller states', () => {
    let state = 1;
    expect(Array.from({ length: 5 }, () => state = nextRandom(state)))
      .toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });
  it.each([
    ['np1-4-1', [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]],
    // Seed 739806647 draws 2147483646 first: x exceeds the 16-way rejection limit.
    ['np1-4-739806647', [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]],
    ['np1-4-2147483646', [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]],
    ['np1-6-42', [10, 14, 7, 2, 13, 14, 17, 0, 8, 16, 13, 7, 5, 10, 11, 3, 15, 3,
      9, 12, 9, 1, 4, 16, 8, 12, 1, 6, 15, 5, 17, 4, 0, 6, 11, 2]],
  ])('deals %s exactly', (code, vector) => {
    expect(createGame(code).board.deck).toEqual(vector);
  });
  it.each(SIZES)('deals each face twice on a %i board', size => {
    const { board } = createGame(`np1-${size}-42`);
    expect(board.deck).toHaveLength(size ** 2);
    for (let face = 0; face < size ** 2 / 2; face++) expect(board.deck.filter(id => id === face)).toHaveLength(2);
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(board.deck)).toBe(true);
  });
  it.each(['np1-4-0', 'np1-04-1', 'np1-4-01', 'np1-4-2147483647', 'np1-5-1', 'np2-4-1',
    ' np1-4-1', 'np1-4-1\n', 'np1-4-1x', 'np1-4-1e2', 'np1-4--1', 'np1-4-99999999999999999999'])
  ('rejects noncanonical code %j', code => { expect(parseBoardCode(code)).toBeNull(); });
});
