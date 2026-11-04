import type { Board } from "./boardCode.ts";

const PARK_MILLER_MODULUS = 2_147_483_647;
const PARK_MILLER_MULTIPLIER = 16_807;
const PARK_MILLER_RANGE = PARK_MILLER_MODULUS - 1;

export function createDeck(board: Board): readonly number[] {
  const count = board.size * board.size;
  const deck = Array.from({ length: count }, (_, index) => Math.floor(index / 2));
  let state = board.seed;

  for (let index = count - 1; index > 0; index -= 1) {
    const limit = Math.floor(PARK_MILLER_RANGE / (index + 1)) * (index + 1);
    let value = limit;
    while (value >= limit) {
      state = (state * PARK_MILLER_MULTIPLIER) % PARK_MILLER_MODULUS;
      value = state - 1;
    }
    const otherIndex = value % (index + 1);
    const current = deck[index];
    const other = deck[otherIndex];
    if (current === undefined || other === undefined) continue;
    deck[index] = other;
    deck[otherIndex] = current;
  }

  return Object.freeze(deck);
}
