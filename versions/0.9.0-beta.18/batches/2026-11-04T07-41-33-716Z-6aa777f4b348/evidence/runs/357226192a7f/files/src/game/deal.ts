export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof SIZES)[number];
export type Board = Readonly<{ code: string; size: Size; seed: number }>;
export const MAX_SEED = 2147483646;

export function isSize(value: unknown): value is Size {
  return SIZES.some(size => size === value);
}

export function parseBoardCode(code: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code, size, seed });
}

export function generateDeck(board: Board): readonly number[] {
  let state = board.seed;
  function draw(bound: number): number {
    const limit = Math.floor(MAX_SEED / bound) * bound;
    do {
      state = (state * 16807) % 2147483647;
    } while (state - 1 >= limit);
    return (state - 1) % bound;
  }
  const deck = Array.from({ length: board.size ** 2 }, (_, index) => Math.floor(index / 2));
  for (let index = deck.length - 1; index > 0; index--) {
    const other = draw(index + 1);
    const left = deck[index];
    const right = deck[other];
    if (left !== undefined && right !== undefined) {
      deck[index] = right;
      deck[other] = left;
    }
  }
  return Object.freeze(deck);
}
