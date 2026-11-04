import type { Board } from './boardCode.ts';

const MODULUS = 2147483647;
const MULTIPLIER = 16807;
const GENERATOR_VALUES = MODULUS - 1;

export function nextRandomState(state: number): number {
  // The greatest product is below Number.MAX_SAFE_INTEGER, so this is exact.
  return (state * MULTIPLIER) % MODULUS;
}

export function generateDeck(board: Board): readonly number[] {
  const deck = Array.from({ length: board.size * board.size }, (_, i) => Math.floor(i / 2));
  let state = board.seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const possibilities = index + 1;
    const limit = Math.floor(GENERATOR_VALUES / possibilities) * possibilities;
    let draw: number;
    do {
      state = nextRandomState(state);
      draw = state - 1;
    } while (draw >= limit);
    const other = draw % possibilities;
    const currentFace = deck[index];
    const otherFace = deck[other];
    if (currentFace === undefined || otherFace === undefined) throw new Error('Invalid deck position.');
    deck[index] = otherFace;
    deck[other] = currentFace;
  }
  return Object.freeze(deck);
}
