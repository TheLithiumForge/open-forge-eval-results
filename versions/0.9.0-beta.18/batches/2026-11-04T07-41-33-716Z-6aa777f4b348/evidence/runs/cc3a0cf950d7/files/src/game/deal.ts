export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof SIZES)[number];
export const MAX_SEED = 2147483646;
export interface Board { readonly code: string; readonly size: Size; readonly seed: number }

export function isSize(value: unknown): value is Size {
  return SIZES.some(size => size === value);
}

export function parseBoardCode(code: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match || match[0] !== code) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code, size, seed });
}

export function parkMiller(state: number): number {
  return (state * 16807) % 2147483647;
}

export function generateDeck(board: Board): readonly number[] {
  let state = board.seed;
  const draw = (bound: number): number => {
    const limit = Math.floor(MAX_SEED / bound) * bound;
    do { state = parkMiller(state); } while (state - 1 >= limit);
    return (state - 1) % bound;
  };
  const deck = Array.from({ length: board.size ** 2 }, (_, index) => Math.floor(index / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = draw(i + 1);
    const first = deck[i];
    const second = deck[j];
    if (first === undefined || second === undefined) throw new Error('Invalid deck position');
    deck[i] = second;
    deck[j] = first;
  }
  return Object.freeze(deck);
}
