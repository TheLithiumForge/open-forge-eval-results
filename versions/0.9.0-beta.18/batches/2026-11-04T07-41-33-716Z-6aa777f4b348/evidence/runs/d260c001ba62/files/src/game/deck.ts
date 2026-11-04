import type { Size } from './boardCode.ts';

export const MODULUS = 2147483647;

export function nextRandom(state: number): number {
  // The largest product is below 2^53, so Number arithmetic stays exact.
  return (state * 16807) % MODULUS;
}

export function generateDeck(size: Size, seed: number): readonly number[] {
  let state = seed;
  const deck = Array.from({ length: size * size }, (_, i) => Math.floor(i / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const bound = i + 1;
    const limit = Math.floor((MODULUS - 1) / bound) * bound;
    do { state = nextRandom(state); } while (state - 1 >= limit);
    const j = (state - 1) % bound;
    const a = deck[i];
    const b = deck[j];
    if (a !== undefined && b !== undefined) { deck[i] = b; deck[j] = a; }
  }
  return Object.freeze(deck);
}
