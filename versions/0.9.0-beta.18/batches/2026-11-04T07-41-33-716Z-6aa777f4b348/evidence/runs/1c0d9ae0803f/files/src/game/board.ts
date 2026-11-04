export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export const MAX_BOARD_SEED = 2_147_483_646;
const PARK_MILLER_MODULUS = 2_147_483_647;
const PARK_MILLER_MULTIPLIER = 16_807;

export type BoardSize = (typeof BOARD_SIZES)[number];
export type Board = Readonly<{
  code: string;
  size: BoardSize;
  deck: readonly number[];
}>;

export function isBoardSize(value: unknown): value is BoardSize {
  return BOARD_SIZES.some((size) => size === value);
}

export function parseBoardCode(value: unknown): { size: BoardSize; seed: number } | null {
  if (typeof value !== "string") return null;
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(value);
  if (!match) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  return isBoardSize(size) && Number.isSafeInteger(seed) && seed <= MAX_BOARD_SEED
    ? { size, seed }
    : null;
}

export function parkMillerNext(state: number): number {
  return (state * PARK_MILLER_MULTIPLIER) % PARK_MILLER_MODULUS;
}

function drawBelow(state: number, bound: number): [number, number] {
  const range = PARK_MILLER_MODULUS - 1;
  const limit = Math.floor(range / bound) * bound;
  let next = state;
  let value = range;
  while (value >= limit) {
    next = parkMillerNext(next);
    value = next - 1;
  }
  return [value % bound, next];
}

export function createBoard(code: string): Board | null {
  const parsed = parseBoardCode(code);
  if (!parsed) return null;
  const count = parsed.size * parsed.size;
  const deck = Array.from({ length: count }, (_, index) => Math.floor(index / 2));
  let state = parsed.seed;
  for (let index = count - 1; index > 0; index -= 1) {
    const [otherIndex, nextState] = drawBelow(state, index + 1);
    state = nextState;
    const current = deck[index];
    const other = deck[otherIndex];
    if (current === undefined || other === undefined) return null;
    deck[index] = other;
    deck[otherIndex] = current;
  }
  return Object.freeze({ code, size: parsed.size, deck: Object.freeze(deck) });
}
