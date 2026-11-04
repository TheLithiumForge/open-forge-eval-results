import { describe, expect, it } from 'vitest';
import { drawIndex, generateDeck, GRID_SIZES, nextRandom, parseBoardCode } from './deck.ts';

describe('version 1 board codes and generation', () => {
  it('matches the independent Park–Miller states and published deck', () => {
    let state = 1;
    const states: number[] = [];
    for (let index = 0; index < 5; index += 1) { state = nextRandom(state); states.push(state); }
    expect(states).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
    const board = parseBoardCode('np1-4-1');
    if (!board) throw new Error('Expected fixture board.');
    expect(generateDeck(board)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(generateDeck(board))).toBe(true);
  });

  it('rejects an out-of-limit generator value before choosing an index', () => {
    // 739806647 advances to 2147483646, which is rejected for a bound of 10.
    expect(drawIndex(739806647, 10)).toEqual({ state: 2147466840, index: 9 });
  });

  it.each(GRID_SIZES)('deals exactly two of each face at size %i', size => {
    const board = parseBoardCode(`np1-${size}-2147483646`);
    if (!board) throw new Error('Expected supported board.');
    const deck = generateDeck(board);
    expect(deck).toHaveLength(size * size);
    for (let face = 0; face < size * size / 2; face += 1) {
      expect(deck.filter(value => value === face)).toHaveLength(2);
    }
  });

  it.each(['np1-4-0', 'np1-04-1', 'np1-4-01', 'np1-5-1', 'np2-4-1', 'np1-4-2147483647',
    'np1-4--1', 'np1-4-1.0', ' np1-4-1', 'np1-4-1\n', 'np1-4-1e2', 'np1-4-9999999999999999'])
  ('rejects noncanonical code %j', code => expect(parseBoardCode(code)).toBeNull());
});
