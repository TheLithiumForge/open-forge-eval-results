import type { GridSize } from "./constants.ts";

const MODULUS = 2_147_483_647;
const MULTIPLIER = 16_807;
const RANGE_SIZE = MODULUS - 1;

function nextState(state: number): number {
  return (state * MULTIPLIER) % MODULUS;
}

function drawIndex(state: { value: number }, bound: number): number {
  const limit = Math.floor(RANGE_SIZE / bound) * bound;
  while (true) {
    state.value = nextState(state.value);
    const value = state.value - 1;
    if (value < limit) return value % bound;
  }
}

export function generateDeck(size: GridSize, seed: number): readonly number[] {
  const count = size * size;
  const deck = Array.from({ length: count }, (_, index) => Math.floor(index / 2));
  const state = { value: seed };
  for (let index = count - 1; index > 0; index -= 1) {
    const other = drawIndex(state, index + 1);
    const held = deck[index];
    const replacement = deck[other];
    if (held !== undefined && replacement !== undefined) {
      deck[index] = replacement;
      deck[other] = held;
    }
  }
  return deck;
}
