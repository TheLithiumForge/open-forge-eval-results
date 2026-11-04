export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export const MAX_SEED = 2_147_483_646;
const PARK_MILLER_MODULUS = 2_147_483_647;
const PARK_MILLER_MULTIPLIER = 16_807;
const PARK_MILLER_RANGE = PARK_MILLER_MODULUS - 1;

export interface BoardDescription {
  readonly boardCode: string;
  readonly size: (typeof BOARD_SIZES)[number];
  readonly seed: number;
}

export function isBoardSize(value: unknown): value is (typeof BOARD_SIZES)[number] {
  return typeof value === 'number' && BOARD_SIZES.some((size) => size === value);
}

export function parseBoardCode(value: unknown): BoardDescription | null {
  if (typeof value !== 'string') return null;
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(value);
  if (match === null || match[0] !== value) return null;
  const rawSize = Number(match[1]);
  const seed = Number(match[2]);
  if (!isBoardSize(rawSize) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ boardCode: value, size: rawSize, seed });
}

function draw(state: { value: number }, bound: number): number {
  const limit = Math.floor(PARK_MILLER_RANGE / bound) * bound;
  while (true) {
    state.value = (state.value * PARK_MILLER_MULTIPLIER) % PARK_MILLER_MODULUS;
    const candidate = state.value - 1;
    if (candidate < limit) return candidate % bound;
  }
}

export function generateDeck(board: BoardDescription): readonly number[] {
  const cards = board.size * board.size;
  const deck = Array.from({ length: cards }, (_unused, index) => Math.floor(index / 2));
  const generator = { value: board.seed };
  for (let index = cards - 1; index > 0; index -= 1) {
    const other = draw(generator, index + 1);
    const currentFace = deck[index];
    const otherFace = deck[other];
    if (currentFace === undefined || otherFace === undefined) throw new Error('Generated deck index out of range');
    deck[index] = otherFace;
    deck[other] = currentFace;
  }
  return Object.freeze(deck);
}
