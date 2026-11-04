import type { BoardDescription } from './boardCode.ts';

export function nextParkMiller(state: number): number {
  // The largest product is below 2^53, so every integer is exact.
  return (state * 16807) % 2147483647;
}

export function generateDeck(board: BoardDescription): readonly number[] {
  const deck = Array.from({ length: board.size ** 2 }, (_, i) => Math.floor(i / 2));
  let state = board.seed;
  function draw(bound: number): number {
    const limit = Math.floor(2147483646 / bound) * bound;
    do { state = nextParkMiller(state); } while (state - 1 >= limit);
    return (state - 1) % bound;
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = draw(i + 1);
    const first = deck[i];
    const second = deck[j];
    if (first !== undefined && second !== undefined) {
      deck[i] = second;
      deck[j] = first;
    }
  }
  return Object.freeze(deck);
}
