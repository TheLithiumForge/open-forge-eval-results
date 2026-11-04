import { describe, expect, it } from 'vitest';
import { generateDeck, nextRandom, parseBoardCode, SIZES } from './boardCode.ts';

describe('version 1 generation', () => {
  it('matches the documented generator states and literal deck', () => {
    let state = 1;
    expect(Array.from({ length: 5 }, () => { state = nextRandom(state); return state; }))
      .toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
    expect(generateDeck(4, 1)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });
  it('matches independent integer reference vectors at other seeds and sizes', () => {
    expect(generateDeck(4, 2147483646)).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
    expect(generateDeck(6, 42)).toEqual([10, 14, 7, 2, 13, 14, 17, 0, 8, 16, 13, 7, 5, 10, 11, 3, 15, 3,
      9, 12, 9, 1, 4, 16, 8, 12, 1, 6, 15, 5, 17, 4, 0, 6, 11, 2]);
  });
  it('rejects the first generator draw when it falls outside an even shuffle bound', () => {
    expect(nextRandom(739806647)).toBe(2147483646);
    expect(generateDeck(4, 739806647)).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
  });
  it.each(SIZES)('has exactly two of every face at size %i', (size) => {
    const deck = generateDeck(size, 123456);
    expect(deck).toHaveLength(size * size);
    for (let face = 0; face < size * size / 2; face += 1) {
      expect(deck.filter((value) => value === face)).toHaveLength(2);
    }
    expect(Object.isFrozen(deck)).toBe(true);
    expect(Object.isFrozen(parseBoardCode(`np1-${size}-1`))).toBe(true);
  });
  it.each(['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', 'np1-5-1', 'np2-4-1',
    'np1-4-1x', 'np1-4-1\n', ' np1-4-1', 'np1-4-1.0', 'np1-4-1e2', 'np1-4-+1'])
  ('rejects noncanonical code %s', (code) => expect(parseBoardCode(code)).toBeNull());
});
