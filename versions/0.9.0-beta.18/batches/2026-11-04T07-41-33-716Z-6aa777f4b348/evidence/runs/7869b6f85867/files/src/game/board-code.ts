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
  return (state * 16807) % MODULUS;
}

export function generateBoard(code: string): Board {
  const parsed = parseBoardCode(code);
  if (!parsed) throw new Error('Invalid board code.');
  const deck = Array.from({ length: parsed.size ** 2 }, (_, index) => Math.floor(index / 2));
  let random = parsed.seed;
  for (let i = deck.length - 1; i > 0; i--) {
    const bound = i + 1;
    const limit = Math.floor(MAX_SEED / bound) * bound;
    let draw: number;
    do {
      random = nextRandom(random);
      draw = random - 1;
    } while (draw >= limit);
    const j = draw % bound;
    const left = deck[i];
    const right = deck[j];
    if (left === undefined || right === undefined) throw new Error('Invalid shuffle position.');
    deck[i] = right;
    deck[j] = left;
  }
  return Object.freeze({ code, ...parsed, deck: Object.freeze(deck) });
}
