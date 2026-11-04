import { describe, expect, it } from 'vitest';
import { drawRandom, generateBoard, nextRandom, parseBoardCode, SIZES } from './deck.ts';

describe('version 1 generation', () => {
  it('uses the independent Park–Miller literal vector', () => {
    let state = 1;
    expect(Array.from({ length: 5 }, () => { state = nextRandom(state); return state; }))
      .toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });
  it.each([
    [1, [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]],
    [2, [2, 0, 1, 4, 7, 4, 5, 6, 5, 7, 2, 0, 3, 1, 3, 6]],
    [2147483646, [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]],
  ])('matches independently calculated deck for seed %s', (seed, deck) => {
    expect(generateBoard(`np1-4-${seed}`)?.deck).toEqual(deck);
  });
  it('rejects a generator draw outside the uniform range', () => {
    // This seed advances to q. With bound 16 that draw must be discarded.
    const seed = 739806647;
    expect(nextRandom(seed)).toBe(2147483646);
    const accepted = nextRandom(2147483646);
    expect(drawRandom(seed, 16)).toEqual({ state: accepted, value: (accepted - 1) % 16 });
  });
  it.each(SIZES)('makes exactly two of every face on a %sx%s board', size => {
    const board = generateBoard(`np1-${size}-42`);
    expect(board?.deck).toHaveLength(size * size);
    for (let face = 0; face < size * size / 2; face++) expect(board?.deck.filter(id => id === face)).toHaveLength(2);
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(board?.deck)).toBe(true);
  });
  it.each(['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', 'np1-5-1',
    'np2-4-1', 'np1-4-1\n', ' np1-4-1', 'np1-4-1.0', 'np1-4-1e3', 'np1-4-+1', ''])
    ('rejects noncanonical code %j', code => expect(parseBoardCode(code)).toBeNull());
});
