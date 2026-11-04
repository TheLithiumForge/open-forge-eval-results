export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type GridSize = (typeof SIZES)[number];
export const MAX_SEED = 2147483646;
const MODULUS = 2147483647;
export type Board = Readonly<{ code: string; size: GridSize; seed: number; deck: readonly number[] }>;

export function isGridSize(value: unknown): value is GridSize {
  return SIZES.some(size => size === value);
}

export function parseBoardCode(code: string): { size: GridSize; seed: number } | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match || match[0] !== code) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  return isGridSize(size) && Number.isSafeInteger(seed) && seed <= MAX_SEED ? { size, seed } : null;
}

export function nextRandom(state: number): number {
  return (state * 16807) % MODULUS;
}

export function drawRandom(state: number, bound: number): { state: number; value: number } {
  const limit = Math.floor(MAX_SEED / bound) * bound;
  do { state = nextRandom(state); } while (state - 1 >= limit);
  return { state, value: (state - 1) % bound };
}

export function generateBoard(code: string): Board | null {
  const parsed = parseBoardCode(code);
  if (!parsed) return null;
  const deck = Array.from({ length: parsed.size ** 2 }, (_, index) => Math.floor(index / 2));
  let state = parsed.seed;
  for (let i = deck.length - 1; i > 0; i--) {
    const draw = drawRandom(state, i + 1);
    state = draw.state;
    const first = deck[i];
    const second = deck[draw.value];
    if (first !== undefined && second !== undefined) {
      deck[i] = second;
      deck[draw.value] = first;
    }
  }
  return Object.freeze({ code, ...parsed, deck: Object.freeze(deck) });
}
