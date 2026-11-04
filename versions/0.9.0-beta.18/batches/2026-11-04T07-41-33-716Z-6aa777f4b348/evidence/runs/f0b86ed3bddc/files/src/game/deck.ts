import { MAX_SEED } from './boardCode.ts';
import type { BoardCode } from './boardCode.ts';

const MULTIPLIER = 16807;
const MODULUS = 2147483647;

export function nextRandom(state: number): number {
  // The maximum product is below 2^53, so integer arithmetic remains exact.
  return (state * MULTIPLIER) % MODULUS;
}

export function generateDeck(board: BoardCode): readonly number[] {
  let state = board.seed;
  function draw(bound: number): number {
    const limit = Math.floor(MAX_SEED / bound) * bound;
    let value: number;
    do {
      state = nextRandom(state);
      value = state - 1;
    } while (value >= limit);
    return value % bound;
  }
  const deck = Array.from({ length: board.size ** 2 }, (_, i) => Math.floor(i / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = draw(i + 1);
    const a = deck[i];
    const b = deck[j];
    if (a === undefined || b === undefined) throw new Error('Invalid shuffle index');
    deck[i] = b;
    deck[j] = a;
  }
  return Object.freeze(deck);
}
