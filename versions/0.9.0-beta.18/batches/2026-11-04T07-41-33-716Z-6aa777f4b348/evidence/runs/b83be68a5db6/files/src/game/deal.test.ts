import { describe, expect, it } from 'vitest';
import { generateDeck, nextRandom, parseBoardCode, sizes } from './deal.ts';

describe('version 1 deals', () => {
  it('agrees with the literal Park–Miller vector', () => {
    let state = 1;
    const results = Array.from({ length: 5 }, () => { state = nextRandom(state); return state; });
    expect(results).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });
  it('agrees with the specification deck', () => {
    expect(generateDeck(4, 1)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });
  it('agrees with independent Python integer vectors, including a rejected draw', () => {
    const expected = [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3];
    expect(generateDeck(4, 2147483646)).toEqual(expected);
    // This seed first draws 2147483646, outside the first shuffle bound.
    expect(generateDeck(4, 739806647)).toEqual(expected);
  });
  it.each(sizes)('has exactly two copies of every face at size %i', size => {
    const deck = generateDeck(size, 1234567);
    expect(deck).toHaveLength(size * size);
    for (let face = 0; face < size * size / 2; face++) expect(deck.filter(n => n === face)).toHaveLength(2);
    expect(Object.isFrozen(deck)).toBe(true);
    expect(generateDeck(size, 1234567)).toEqual(deck);
  });
  it.each(['np2-4-1', 'np1-5-1', 'np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4--1',
    'np1-4-2147483647', 'np1-4-1.0', 'np1-4-1e2', ' np1-4-1', 'np1-4-1\n', 'np1-4-999999999999999999'])
  ('rejects noncanonical code %j', code => { expect(parseBoardCode(code)).toBeNull(); });
});
