import type { BoardDescription } from './boardCode.ts';

const MODULUS = 2147483647;
const GENERATOR_VALUES = MODULUS - 1;

export function nextGeneratorState(state: number): number {
  // The largest multiplication is below 2^53, so integer arithmetic is exact.
  return (state * 16807) % MODULUS;
}

export function generateDeck(board: BoardDescription): readonly number[] {
  let state = board.seed;
  const deck = Array.from({ length: board.size * board.size }, (_, i) => Math.floor(i / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const possibilities = i + 1;
    const limit = Math.floor(GENERATOR_VALUES / possibilities) * possibilities;
    let draw: number;
    do {
      state = nextGeneratorState(state);
      draw = state - 1;
    } while (draw >= limit);
    const j = draw % possibilities;
    const first = deck[i];
    const second = deck[j];
    if (first === undefined || second === undefined) throw new Error('Invalid shuffle position');
    deck[i] = second;
    deck[j] = first;
  }
  return Object.freeze(deck);
}
