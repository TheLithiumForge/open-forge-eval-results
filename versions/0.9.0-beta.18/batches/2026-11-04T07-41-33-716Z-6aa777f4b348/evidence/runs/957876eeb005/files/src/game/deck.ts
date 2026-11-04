import type { Board } from './board-code.ts';

const MODULUS = 2147483647;
const GENERATOR_VALUES = MODULUS - 1;

export function nextRandom(state: number): number {
  // The largest product is below 2^53, so multiplication is exact.
  return (state * 16807) % MODULUS;
}

export function drawRandom(state: number, bound: number): readonly [number, number] {
  const limit = Math.floor(GENERATOR_VALUES / bound) * bound;
  let next = state;
  do {
    next = nextRandom(next);
  } while (next - 1 >= limit);
  return [next, (next - 1) % bound];
}

export function generateDeck(board: Board): readonly number[] {
  const deck = Array.from({ length: board.size * board.size }, (_, i) => Math.floor(i / 2));
  let state = board.seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const [next, position] = drawRandom(state, index + 1);
    state = next;
    const first = deck[index];
    const second = deck[position];
    if (first === undefined || second === undefined) throw new Error('Invalid shuffle position');
    deck[index] = second;
    deck[position] = first;
  }
  return Object.freeze(deck);
}
