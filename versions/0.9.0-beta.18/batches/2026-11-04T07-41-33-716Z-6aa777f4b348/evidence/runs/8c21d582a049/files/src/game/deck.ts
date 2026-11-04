import type { BoardDescription } from './boardCode.ts';

export const RANDOM_MODULUS = 2147483647;
const RANDOM_RANGE = RANDOM_MODULUS - 1;

export function nextRandomState(state: number): number {
  return (state * 16807) % RANDOM_MODULUS;
}

export function boundedDraw(state: number, possibilities: number): { state: number; value: number } {
  const limit = Math.floor(RANDOM_RANGE / possibilities) * possibilities;
  let next = nextRandomState(state);
  while (next - 1 >= limit) next = nextRandomState(next);
  return { state: next, value: (next - 1) % possibilities };
}

export function generateDeck(board: BoardDescription): readonly number[] {
  const deck = Array.from({ length: board.size ** 2 }, (_, index) => Math.floor(index / 2));
  let randomState = board.seed;
  for (let index = deck.length - 1; index > 0; index--) {
    const draw = boundedDraw(randomState, index + 1);
    randomState = draw.state;
    const atIndex = deck[index];
    const atDraw = deck[draw.value];
    if (atIndex === undefined || atDraw === undefined) throw new Error('Invalid shuffle index');
    deck[index] = atDraw;
    deck[draw.value] = atIndex;
  }
  return Object.freeze(deck);
}
