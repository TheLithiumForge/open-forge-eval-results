import type { BoardDescription } from './boardCode.ts';

const MODULUS = 2_147_483_647;
const RANDOM_VALUES = MODULUS - 1;

export function nextRandom(state: number): number {
  return (state * 16_807) % MODULUS;
}

export function drawBounded(state: number, bound: number): { state: number; value: number } {
  const limit = Math.floor(RANDOM_VALUES / bound) * bound;
  let next = nextRandom(state);
  while (next - 1 >= limit) next = nextRandom(next);
  return { state: next, value: (next - 1) % bound };
}

export function generateDeck(board: BoardDescription): readonly number[] {
  const deck = Array.from({ length: board.size * board.size }, (_, index) => Math.floor(index / 2));
  let randomState = board.seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const draw = drawBounded(randomState, index + 1);
    randomState = draw.state;
    const current = deck[index];
    const chosen = deck[draw.value];
    if (current === undefined || chosen === undefined) throw new Error('Invalid shuffle position');
    deck[index] = chosen;
    deck[draw.value] = current;
  }
  return Object.freeze(deck);
}
