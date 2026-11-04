import { describe, expect, it } from 'vitest';
import { MAX_SEED, parseBoardCode, SIZES } from './boardCode.ts';
import { generateDeck, nextRandom } from './deck.ts';

describe('version 1 generation', () => {
  it('matches independent Park-Miller and deck vectors', () => {
    let state = 1;
    expect(Array.from({ length: 5 }, () => { state = nextRandom(state); return state; }))
      .toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
    expect(generateDeck(4, 1)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });
  it.each(SIZES)('has exactly two of every face on size %i', size => {
    for (const seed of [1, 19, MAX_SEED]) {
      const deck = generateDeck(size, seed);
      expect(deck).toHaveLength(size * size);
      const counts = new Map<number, number>();
      for (const face of deck) counts.set(face, (counts.get(face) ?? 0) + 1);
      expect(counts.size).toBe(size * size / 2);
      expect([...counts.values()].every(count => count === 2)).toBe(true);
      expect(generateDeck(size, seed)).toEqual(deck);
      expect(Object.isFrozen(deck)).toBe(true);
    }
  });
  it.each(['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', 'np2-4-1', 'np1-5-1', ' np1-4-1', 'np1-4-1\n', 'np1-4-1x'])
    ('rejects noncanonical code %j', code => expect(parseBoardCode(code)).toBeNull());
  it('accepts both seed bounds', () => {
    expect(parseBoardCode('np1-4-1')?.seed).toBe(1);
    expect(parseBoardCode('np1-16-2147483646')?.seed).toBe(MAX_SEED);
  });
});
