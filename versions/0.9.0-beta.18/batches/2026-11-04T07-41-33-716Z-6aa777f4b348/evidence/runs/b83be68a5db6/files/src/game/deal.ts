export const sizes = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof sizes)[number];
export const seedLimit = 2147483646;
export const boardVersion = 'np1';

export interface Board {
  readonly boardCode: string;
  readonly size: Size;
  readonly seed: number;
  readonly deck: readonly number[];
}

export function isSize(value: unknown): value is Size {
  return sizes.some(size => size === value);
}

export function nextRandom(state: number): number {
  // The largest product is below 2^53, so Number integer arithmetic is exact.
  return (state * 16807) % 2147483647;
}

export function generateDeck(size: Size, seed: number): readonly number[] {
  const deck = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  let state = seed;
  for (let i = deck.length - 1; i > 0; i--) {
    const bound = i + 1;
    const limit = Math.floor(seedLimit / bound) * bound;
    do { state = nextRandom(state); } while (state - 1 >= limit);
    const j = (state - 1) % bound;
    const left = deck[i];
    const right = deck[j];
    if (left === undefined || right === undefined) throw new Error('Invalid shuffle position');
    deck[i] = right;
    deck[j] = left;
  }
  return Object.freeze(deck);
}

export function parseBoardCode(text: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(text);
  if (!match || match[0] !== text) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isSize(size) || !Number.isSafeInteger(seed) || seed > seedLimit) return null;
  return Object.freeze({ boardCode: text, size, seed, deck: generateDeck(size, seed) });
}
