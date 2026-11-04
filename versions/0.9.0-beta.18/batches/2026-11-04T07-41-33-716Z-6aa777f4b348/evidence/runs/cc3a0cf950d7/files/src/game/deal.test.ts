import { describe, expect, it } from 'vitest';
import { generateDeck, parkMiller, parseBoardCode, SIZES } from './deal.ts';

describe('version 1 generation', () => {
  it('uses the literal Park-Miller reference states', () => {
    let state = 1;
    expect(Array.from({ length: 5 }, () => { state = parkMiller(state); return state; }))
      .toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });
  it('matches the documented literal deal', () => {
    const board = parseBoardCode('np1-4-1');
    if (!board) throw new Error('Invalid reference');
    expect(generateDeck(board)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(Object.isFrozen(generateDeck(board))).toBe(true);
  });
  it('matches a second literal vector computed with an independent integer reference', () => {
    const board = parseBoardCode('np1-4-42');
    if (!board) throw new Error('Invalid reference');
    expect(generateDeck(board)).toEqual([4, 2, 1, 7, 6, 3, 1, 7, 5, 0, 3, 0, 4, 5, 6, 2]);
  });
  it.each(SIZES)('creates precisely two of every face at size %i', size => {
    const board = parseBoardCode(`np1-${size}-2147483646`);
    if (!board) throw new Error('Invalid reference');
    const deck = generateDeck(board);
    expect(deck).toHaveLength(size ** 2);
    for (let face = 0; face < size ** 2 / 2; face++) expect(deck.filter(id => id === face)).toHaveLength(2);
    expect(generateDeck(board)).toEqual(deck);
  });
  it.each(['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', 'np1-5-1',
    'np2-4-1', 'np1-4-1\n', ' np1-4-1', 'np1-4-1.0', 'np1-4-1e2', 'np1-4-+1'])
  ('rejects noncanonical code %j', code => { expect(parseBoardCode(code)).toBeNull(); });
});
