export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof SIZES)[number];
export const MAX_SEED = 2147483646;
const MODULUS = 2147483647;
export interface Board {
  readonly code: string;
  readonly size: Size;
  readonly seed: number;
  readonly deck: readonly number[];
}

export function isSize(value: unknown): value is Size {
  return SIZES.some((size) => size === value);
}

export function nextRandom(state: number): number {
  // The largest product is below 2^53, so JS integer arithmetic is exact here.
  return (state * 16807) % MODULUS;
}

export function generateDeck(size: Size, seed: number): readonly number[] {
  const deck = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  let state = seed;
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const bound = i + 1;
    const limit = Math.floor(MAX_SEED / bound) * bound;
    let x: number;
    do {
      state = nextRandom(state);
      x = state - 1;
    } while (x >= limit);
    const j = x % bound;
    const first = deck[i];
    const second = deck[j];
    if (first !== undefined && second !== undefined) {
      deck[i] = second;
      deck[j] = first;
    }
  }
  return Object.freeze(deck);
}

export function parseBoardCode(code: string): Board | null {
  const parts = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!parts) return null;
  const size = Number(parts[1]);
  const seed = Number(parts[2]);
  if (!isSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code, size, seed, deck: generateDeck(size, seed) });
}
