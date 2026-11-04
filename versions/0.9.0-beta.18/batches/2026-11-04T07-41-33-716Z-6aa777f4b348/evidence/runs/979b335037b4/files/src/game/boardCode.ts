export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof SIZES)[number];
export const MAX_SEED = 2147483646;
export type Board = Readonly<{ code: string; size: Size; seed: number; deck: readonly number[] }>;

export function isSize(value: unknown): value is Size {
  return SIZES.some(size => size === value);
}

export function parseBoardCode(code: unknown): { size: Size; seed: number; code: string } | null {
  if (typeof code !== 'string') return null;
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match || match[0] !== code) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isSize(size) || !Number.isInteger(seed) || seed > MAX_SEED) return null;
  return { size, seed, code };
}

export function generateDeck(size: Size, seed: number): readonly number[] {
  let state = seed;
  const deck = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const bound = i + 1;
    const limit = Math.floor(MAX_SEED / bound) * bound;
    let draw: number;
    do {
      state = (state * 16807) % 2147483647;
      draw = state - 1;
    } while (draw >= limit);
    const j = draw % bound;
    const left = deck[i];
    const right = deck[j];
    if (left === undefined || right === undefined) throw new Error('Invalid shuffle index');
    deck[i] = right;
    deck[j] = left;
  }
  return Object.freeze(deck);
}

export function createBoard(code: string): Board | null {
  const parsed = parseBoardCode(code);
  return parsed ? Object.freeze({ ...parsed, deck: generateDeck(parsed.size, parsed.seed) }) : null;
}
