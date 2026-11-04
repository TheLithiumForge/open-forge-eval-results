export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof SIZES)[number];
export const MAX_SEED = 2147483646;
const MODULUS = MAX_SEED + 1;
export type Board = Readonly<{ code: string; size: Size; deck: readonly number[] }>;

export function isSize(value: unknown): value is Size {
  return SIZES.some(size => size === value);
}

export function parseBoardCode(code: string): { size: Size; seed: number } | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match || match[0] !== code) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  return isSize(size) && Number.isSafeInteger(seed) && seed <= MAX_SEED ? { size, seed } : null;
}

export function nextRandom(state: number): number {
  // The largest product is below Number.MAX_SAFE_INTEGER.
  return (state * 16807) % MODULUS;
}

export function generateBoard(code: string): Board | null {
  const parsed = parseBoardCode(code);
  if (!parsed) return null;
  let state = parsed.seed;
  const deck = Array.from({ length: parsed.size ** 2 }, (_, index) => Math.floor(index / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const bound = i + 1;
    const limit = Math.floor(MAX_SEED / bound) * bound;
    let x: number;
    do { state = nextRandom(state); x = state - 1; } while (x >= limit);
    const j = x % bound;
    const first = deck[i];
    const second = deck[j];
    if (first === undefined || second === undefined) throw new Error('Invalid shuffle index');
    deck[i] = second;
    deck[j] = first;
  }
  return Object.freeze({ code, size: parsed.size, deck: Object.freeze(deck) });
}
