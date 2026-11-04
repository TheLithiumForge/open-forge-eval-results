import type { BoardDescription } from './boardCode.ts';

const GENERATOR_MODULUS = 2147483647;
const GENERATOR_VALUES = GENERATOR_MODULUS - 1;

export function nextGeneratorState(state: number): number {
  // The largest product is below 2^53, so integer multiplication stays exact.
  return (state * 16807) % GENERATOR_MODULUS;
}

export function drawBelow(state: number, bound: number): { state: number; value: number } {
  const limit = Math.floor(GENERATOR_VALUES / bound) * bound;
  let next = state;
  do {
    next = nextGeneratorState(next);
  } while (next - 1 >= limit);
  return { state: next, value: (next - 1) % bound };
}

export function generateDeck(board: BoardDescription): readonly number[] {
  const deck = Array.from({ length: board.size * board.size }, (_, index) => Math.floor(index / 2));
  let generator = board.seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const draw = drawBelow(generator, index + 1);
    generator = draw.state;
    const current = deck[index];
    const other = deck[draw.value];
    if (current !== undefined && other !== undefined) {
      deck[index] = other;
      deck[draw.value] = current;
    }
  }
  return Object.freeze(deck);
}
