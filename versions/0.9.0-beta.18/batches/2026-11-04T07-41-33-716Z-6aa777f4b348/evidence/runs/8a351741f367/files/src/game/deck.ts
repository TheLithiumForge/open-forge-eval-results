import { MAX_SEED } from './boardCode.ts';
import type { BoardDescription } from './boardCode.ts';

export function nextRandomState(state: number): number {
  return (state * 16_807) % 2_147_483_647;
}

export function drawBelow(state: number, bound: number): readonly [number, number] {
  const limit = Math.floor(MAX_SEED / bound) * bound;
  let next = state;
  do {
    next = nextRandomState(next);
  } while (next - 1 >= limit);
  return [next, (next - 1) % bound];
}

export function generateDeck(board: BoardDescription): readonly number[] {
  const deck = Array.from({ length: board.size * board.size }, (_, index) => Math.floor(index / 2));
  let state = board.seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const [next, other] = drawBelow(state, index + 1);
    state = next;
    const first = deck[index];
    const second = deck[other];
    if (first === undefined || second === undefined) throw new Error('Invalid shuffle position.');
    deck[index] = second;
    deck[other] = first;
  }
  return Object.freeze(deck);
}
