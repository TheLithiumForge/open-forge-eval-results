export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof SIZES)[number];
export const MAX_SEED = 2147483646;
const MODULUS = 2147483647;

export interface BoardDescription {
  readonly code: string;
  readonly size: Size;
  readonly seed: number;
}

export function isSize(value: unknown): value is Size {
  return SIZES.some((size) => size === value);
}

export function parseBoardCode(text: string): BoardDescription | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(text);
  if (!match || match[0] !== text) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code: text, size, seed });
}

export function nextRandom(state: number): number {
  // The largest product is below 2^53, so every multiplication is exact.
  return (state * 16807) % MODULUS;
}

export function drawBounded(state: number, bound: number): readonly [number, number] {
  const limit = Math.floor(MAX_SEED / bound) * bound;
  let next = state;
  do {
    next = nextRandom(next);
  } while (next - 1 >= limit);
  return [next, (next - 1) % bound];
}

export function generateDeck(board: BoardDescription): readonly number[] {
  const deck = Array.from({ length: board.size * board.size }, (_, index) => Math.floor(index / 2));
  let random = board.seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const [next, target] = drawBounded(random, index + 1);
    random = next;
    const first = deck[index];
    const second = deck[target];
    if (first === undefined || second === undefined) throw new Error('Invalid shuffle position');
    deck[index] = second;
    deck[target] = first;
  }
  return Object.freeze(deck);
}
