export const GRID_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type GridSize = (typeof GRID_SIZES)[number];
export const MAX_SEED = 2147483646;
const MODULUS = 2147483647;

export type Board = Readonly<{ code: string; size: GridSize; seed: number }>;

export function isGridSize(value: unknown): value is GridSize {
  return GRID_SIZES.some(size => size === value);
}

export function parseBoardCode(code: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]{0,9})$/.exec(code);
  if (!match || match[0] !== code) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isGridSize(size) || !Number.isInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code, size, seed });
}

export function nextRandom(state: number): number {
  return (state * 16807) % MODULUS;
}

export function drawIndex(state: number, bound: number): Readonly<{ state: number; index: number }> {
  const limit = Math.floor(MAX_SEED / bound) * bound;
  let next = nextRandom(state);
  while (next - 1 >= limit) next = nextRandom(next);
  return { state: next, index: (next - 1) % bound };
}

export function generateDeck(board: Board): readonly number[] {
  const deck = Array.from({ length: board.size * board.size }, (_, index) => Math.floor(index / 2));
  let state = board.seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const draw = drawIndex(state, index + 1);
    state = draw.state;
    const current = deck[index];
    const other = deck[draw.index];
    if (current === undefined || other === undefined) throw new Error('Invalid shuffle position.');
    deck[index] = other;
    deck[draw.index] = current;
  }
  return Object.freeze(deck);
}
