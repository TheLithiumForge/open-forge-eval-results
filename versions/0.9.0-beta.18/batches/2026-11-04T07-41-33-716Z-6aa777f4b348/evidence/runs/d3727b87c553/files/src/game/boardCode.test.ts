import { describe, expect, it } from 'vitest';
import { drawBounded, generateDeck, nextRandom, parseBoardCode, SIZES } from './boardCode.ts';

function board(code: string) {
  const result = parseBoardCode(code);
  if (!result) throw new Error('Invalid test board');
  return result;
}

describe('version 1 board codes and generation', () => {
  it('matches the published Park-Miller states', () => {
    let state = 1;
    const draws = Array.from({ length: 5 }, () => (state = nextRandom(state)));
    expect(draws).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });
  it('matches the independent literal deck vector', () => {
    expect(generateDeck(board('np1-4-1'))).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });
  it('rejects a generator value outside the uniform range', () => {
    // This seed produces MAX_SEED first, requiring another draw for bound 256.
    expect(drawBounded(739806647, 256)).toEqual([2147466840, 87]);
  });
  it.each(SIZES)('deals exactly two of each face at size %i', (size) => {
    const description = board(`np1-${size}-2147483646`);
    const deck = generateDeck(description);
    expect(deck).toHaveLength(size * size);
    expect(Object.isFrozen(deck)).toBe(true);
    expect(Object.isFrozen(description)).toBe(true);
    for (let face = 0; face < size * size / 2; face += 1) expect(deck.filter((value) => value === face)).toHaveLength(2);
    expect(generateDeck(description)).toEqual(deck);
  });
  it.each(['np1-4-0', 'np1-4-01', 'np1-04-1', 'np2-4-1', 'np1-5-1', 'np1-4-2147483647',
    'np1-4-1\n', ' np1-4-1', 'np1-4-1 ', 'np1-4-1.0', 'np1-4-1e2', 'np1-4--1', ''])('rejects noncanonical code %j', (code) => {
    expect(parseBoardCode(code)).toBeNull();
  });
});
