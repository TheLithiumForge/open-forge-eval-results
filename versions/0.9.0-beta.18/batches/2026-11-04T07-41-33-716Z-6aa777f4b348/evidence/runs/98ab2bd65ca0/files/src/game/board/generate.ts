import type { BoardCode } from "./code.ts";

export const PARK_MILLER_MODULUS = 2147483647;
const PARK_MILLER_MULTIPLIER = 16807;
const RANDOM_VALUES = PARK_MILLER_MODULUS - 1;

export function nextParkMillerState(state: number): number {
  return (state * PARK_MILLER_MULTIPLIER) % PARK_MILLER_MODULUS;
}

export function generateDeck(board: BoardCode): readonly number[] {
  const cardCount = board.size * board.size;
  const deck = Array.from({ length: cardCount }, (_, index) => Math.floor(index / 2));
  let state = board.seed;

  const draw = (bound: number): number => {
    const limit = Math.floor(RANDOM_VALUES / bound) * bound;
    let sample: number;
    do {
      state = nextParkMillerState(state);
      sample = state - 1;
    } while (sample >= limit);
    return sample % bound;
  };

  for (let index = cardCount - 1; index > 0; index -= 1) {
    const other = draw(index + 1);
    const currentCard = deck[index];
    const otherCard = deck[other];
    if (currentCard !== undefined && otherCard !== undefined) {
      deck[index] = otherCard;
      deck[other] = currentCard;
    }
  }

  return Object.freeze(deck);
}
