import { describe, expect, it } from 'vitest';
import { parseBoardCode, SIDES } from './boardCode.ts';
import { generateDeck, nextRandomState } from './deck.ts';

function deck(code: string): readonly number[] {
  const board = parseBoardCode(code);
  if (!board) throw new Error('Invalid fixture.');
  return generateDeck(board);
}

describe('np1 board codes and independent generation vectors', () => {
  it('matches the published Park–Miller states', () => {
    let state = 1;
    const actual = Array.from({ length: 5 }, () => {
      state = nextRandomState(state);
      return state;
    });
    expect(actual).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });

  it('matches the published seed-1 deal and a Python integer-arithmetic vector', () => {
    expect(deck('np1-4-1')).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(deck('np1-4-2147483646')).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
  });

  it('rejects a biased shuffle draw before using its next generator state', () => {
    // Python modular inverse selected this seed: its first state is 2147483646.
    expect(nextRandomState(739806647)).toBe(2147483646);
    expect(deck('np1-4-739806647')).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
  });

  it.each(SIDES)('creates exactly two of each face at size %i', (size) => {
    const cards = deck(`np1-${size}-987654321`);
    expect(cards).toHaveLength(size * size);
    expect(Object.isFrozen(cards)).toBe(true);
    for (let face = 0; face < size * size / 2; face += 1) {
      expect(cards.filter((card) => card === face)).toHaveLength(2);
    }
    expect(cards).toEqual(deck(`np1-${size}-987654321`));
  });

  it.each([
    '', 'np2-4-1', 'np1-04-1', 'np1-5-1', 'np1-4-0', 'np1-4-01',
    'np1-4--1', 'np1-4-1.0', 'np1-4-2147483647', 'np1-4-1e2',
    ' np1-4-1', 'np1-4-1 ', 'np1-4-1\n', 'np1-4-1\r\n',
  ])('rejects noncanonical code %j', (code) => {
    expect(parseBoardCode(code)).toBeNull();
  });
});
