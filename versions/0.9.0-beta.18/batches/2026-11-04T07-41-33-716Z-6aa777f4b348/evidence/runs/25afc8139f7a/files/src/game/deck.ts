import type { BoardDescription } from './boardCode.ts';

const MODULUS = 2147483647;
const MULTIPLIER = 16807;
const RESULT_COUNT = MODULUS - 1;

export function nextParkMiller(state: number): number {
  // The largest product is below 2^53, so integer multiplication is exact.
  return (state * MULTIPLIER) % MODULUS;
}

export function boundedDraw(state: number, bound: number): Readonly<{
  state: number;
  value: number;
}> {
  const limit = Math.floor(RESULT_COUNT / bound) * bound;
  let next = nextParkMiller(state);
  while (next - 1 >= limit) next = nextParkMiller(next);
  return { state: next, value: (next - 1) % bound };
}

export function generateDeck(board: BoardDescription): readonly number[] {
  const deck = Array.from({ length: board.size * board.size }, (_, index) => Math.floor(index / 2));
  let randomState = board.seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const draw = boundedDraw(randomState, index + 1);
    randomState = draw.state;
    const first = deck[index];
    const second = deck[draw.value];
    if (first === undefined || second === undefined) throw new Error('Invalid deck position.');
    deck[index] = second;
    deck[draw.value] = first;
  }
  return Object.freeze(deck);
}
