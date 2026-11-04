export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof SIZES)[number];
export const MAX_SEED = 2147483646;
export type Board = Readonly<{ code: string; size: Size; seed: number; deck: readonly number[] }>;

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

export function generateDeck(size: Size, seed: number): readonly number[] {
  let state = seed;
  const draw = (bound: number) => {
    const limit = Math.floor(MAX_SEED / bound) * bound;
    do { state = (state * 16807) % 2147483647; } while (state - 1 >= limit);
    return (state - 1) % bound;
  };
  const deck = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = draw(i + 1);
    const a = deck[i];
    const b = deck[j];
    if (a !== undefined && b !== undefined) { deck[i] = b; deck[j] = a; }
  }
  return Object.freeze(deck);
}

export function createBoard(code: string): Board | null {
  const parsed = parseBoardCode(code);
  return parsed ? Object.freeze({ code, ...parsed, deck: generateDeck(parsed.size, parsed.seed) }) : null;
}
