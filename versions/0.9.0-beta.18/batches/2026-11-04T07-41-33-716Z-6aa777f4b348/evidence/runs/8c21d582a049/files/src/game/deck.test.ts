import { describe, expect, it } from 'vitest';
import { boardCode, MAX_SEED, parseBoardCode, SIZES } from './boardCode.ts';
import { boundedDraw, generateDeck, nextRandomState } from './deck.ts';

describe('version 1 board codes and generation (D01–D04)', () => {
  it.each(['np1-4-1', 'np1-16-2147483646'])('accepts %s', code => {
    expect(parseBoardCode(code)?.code).toBe(code);
  });
  it.each(['np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', 'np2-4-1',
    'np1-5-1', 'np1-4-1\n', 'np1-4-1\r', 'np1-4-1\r\n', 'np1-4-1\u2028',
    ' np1-4-1', 'np1-4-1 ', 'np1-4-1.0', '', null])('rejects %s', code => {
    expect(parseBoardCode(code)).toBeNull();
  });
  it('matches the independent Park–Miller literal sequence', () => {
    let state = 1;
    const actual = Array.from({ length: 5 }, () => (state = nextRandomState(state)));
    expect(actual).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });
  it('matches the specified literal deck', () => {
    const description = parseBoardCode('np1-4-1');
    if (!description) throw new Error('Invalid test board');
    expect(generateDeck(description)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });
  it.each(SIZES)('contains every face exactly twice at size %i and boundary seeds', size => {
    for (const seed of [1, MAX_SEED]) {
      const description = parseBoardCode(boardCode(size, seed));
      if (!description) throw new Error('Invalid test board');
      const deck = generateDeck(description);
      expect(deck).toHaveLength(size ** 2);
      expect(Object.isFrozen(deck)).toBe(true);
      for (let face = 0; face < size ** 2 / 2; face++) {
        expect(deck.filter(value => value === face)).toHaveLength(2);
      }
    }
  });
  it('produces in-range bounded draws', () => {
    expect(boundedDraw(1, 16)).toEqual({ state: 16807, value: 6 });
  });
  it('rejects the incomplete tail of the generator range before drawing again', () => {
    expect(nextRandomState(739806647)).toBe(2147483646);
    expect(boundedDraw(739806647, 16)).toEqual({ state: 2147466840, value: 7 });
  });
  it.each([
    [2, [2, 0, 1, 4, 7, 4, 5, 6, 5, 7, 2, 0, 3, 1, 3, 6]],
    [2147483646, [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]],
  ])('matches an independently calculated Python integer vector for seed %s', (seed, expected) => {
    const description = parseBoardCode(`np1-4-${seed}`);
    if (!description) throw new Error('Invalid test board');
    expect(generateDeck(description)).toEqual(expected);
  });
});
