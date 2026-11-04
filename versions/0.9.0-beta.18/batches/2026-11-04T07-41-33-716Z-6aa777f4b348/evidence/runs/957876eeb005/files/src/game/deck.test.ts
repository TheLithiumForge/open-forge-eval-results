import { expect, it } from 'vitest';
import { parseBoardCode, SUPPORTED_SIZES } from './board-code.ts';
import { drawRandom, generateDeck, nextRandom } from './deck.ts';

it('matches the independent Park–Miller states in D03', () => {
  const actual: number[] = [];
  let seed = 1;
  for (let index = 0; index < 5; index += 1) { seed = nextRandom(seed); actual.push(seed); }
  expect(actual).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
});

it('rejects generator values outside the unbiased range', () => {
  expect(drawRandom(739806647, 256)).toEqual([2147466840, 87]);
});

// Literal decks independently computed with integer arithmetic, including D04's vector.
for (const [code, vector] of [
  ['np1-4-1', [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]],
  ['np1-4-2', [2, 0, 1, 4, 7, 4, 5, 6, 5, 7, 2, 0, 3, 1, 3, 6]],
  ['np1-4-2147483646', [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]],
] as const) {
  it(`matches the literal deck for ${code}`, () => {
    const board = parseBoardCode(code);
    if (board === null) throw new Error('Invalid fixture');
    expect(generateDeck(board)).toEqual(vector);
  });
}

it('gives every face two positions at every size and freezes the deck and board', () => {
  for (const size of SUPPORTED_SIZES) {
    const board = parseBoardCode(`np1-${size}-123456`);
    if (board === null) throw new Error('Invalid fixture');
    const deck = generateDeck(board);
    expect(deck).toHaveLength(size * size);
    for (let face = 0; face < size * size / 2; face += 1) {
      expect(deck.filter(value => value === face)).toHaveLength(2);
    }
    expect(Object.isFrozen(deck)).toBe(true);
    expect(Object.isFrozen(board)).toBe(true);
  }
});
