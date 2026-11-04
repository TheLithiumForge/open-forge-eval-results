import type { Board } from './boardCode.ts';

const MODULUS = 2147483647;
const GENERATOR_RANGE = MODULUS - 1;
export function parkMiller(state: number): number {
  // The largest product is below 2^53, so integer arithmetic is exact.
  return (state * 16807) % MODULUS;
}

export function generateDeck(board: Board): readonly number[] {
  const deck = Array.from({ length: board.size ** 2 }, (_, index) => Math.floor(index / 2));
  let randomState = board.seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const bound = index + 1;
    const limit = Math.floor(GENERATOR_RANGE / bound) * bound;
    let value: number;
    do {
      randomState = parkMiller(randomState);
      value = randomState - 1;
    } while (value >= limit);
    const otherIndex = value % bound;
    const current = deck[index];
    const other = deck[otherIndex];
    if (current === undefined || other === undefined) throw new Error('Invalid deck position');
    deck[index] = other;
    deck[otherIndex] = current;
  }
  return Object.freeze(deck);
}
