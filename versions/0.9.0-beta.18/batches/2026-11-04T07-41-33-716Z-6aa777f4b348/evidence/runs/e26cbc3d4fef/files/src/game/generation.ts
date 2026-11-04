import type { BoardDescription } from './boardCode.ts';

const MODULUS = 2147483647;
const RESULT_COUNT = MODULUS - 1;

export function nextGeneratorState(state: number): number {
  // The largest product is below 2^53, so these integer operations are exact.
  return (state * 16807) % MODULUS;
}

export function drawBounded(state: number, possibilities: number): readonly [number, number] {
  const limit = Math.floor(RESULT_COUNT / possibilities) * possibilities;
  let next = state;
  do {
    next = nextGeneratorState(next);
  } while (next - 1 >= limit);
  return [next, (next - 1) % possibilities];
}

export function generateDeck(board: BoardDescription): readonly number[] {
  const deck = Array.from({ length: board.size * board.size }, (_, index) => Math.floor(index / 2));
  let randomState = board.seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const [next, destination] = drawBounded(randomState, index + 1);
    randomState = next;
    const first = deck[index];
    const second = deck[destination];
    if (first === undefined || second === undefined) throw new Error('Invalid shuffle index.');
    deck[index] = second;
    deck[destination] = first;
  }
  return Object.freeze(deck);
}
