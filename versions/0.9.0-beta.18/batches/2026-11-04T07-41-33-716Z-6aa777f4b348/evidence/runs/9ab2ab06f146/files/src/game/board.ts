export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof SIZES)[number];
export const MAX_SEED = 2147483646;
const MODULUS = 2147483647;
export type Board = Readonly<{
  code: string; size: Size; seed: number; deck: readonly number[];
}>;

export function isSize(value: unknown): value is Size {
  return SIZES.some(size => size === value);
}

export function parseBoardCode(code: string): { size: Size; seed: number } | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match || match[0] !== code) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  return isSize(size) && Number.isSafeInteger(seed) && seed <= MAX_SEED
    ? { size, seed } : null;
}

export function nextRandom(state: number): number {
  // The largest product is below 2^53; every integer operation is exact.
  return (state * 16807) % MODULUS;
}

export function generateDeck(size: Size, seed: number): readonly number[] {
  const deck = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  let state = seed;
  for (let index = deck.length - 1; index > 0; index--) {
    const bound = index + 1;
    const limit = Math.floor(MAX_SEED / bound) * bound;
    do { state = nextRandom(state); } while (state - 1 >= limit);
    const target = (state - 1) % bound;
    const first = deck[index];
    const second = deck[target];
    if (first !== undefined && second !== undefined) {
      deck[index] = second;
      deck[target] = first;
    }
  }
  return Object.freeze(deck);
}

export function createBoard(code: string): Board | null {
  const parsed = parseBoardCode(code);
  return parsed ? Object.freeze({ code, ...parsed, deck: generateDeck(parsed.size, parsed.seed) }) : null;
}
