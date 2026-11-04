export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type BoardSize = (typeof BOARD_SIZES)[number];
export const MIN_SEED = 1;
export const MAX_SEED = 2_147_483_646;
const PARK_MILLER_MODULUS = 2_147_483_647;
const PARK_MILLER_MULTIPLIER = 16_807;
const RANDOM_RANGE = 2_147_483_646;

export interface Board {
  readonly code: string;
  readonly size: BoardSize;
  readonly seed: number;
  readonly deck: readonly number[];
}

export function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === 'number' && BOARD_SIZES.some((size) => size === value);
}

function draw(state: { value: number }, bound: number): number {
  const limit = Math.floor(RANDOM_RANGE / bound) * bound;
  while (true) {
    state.value = (state.value * PARK_MILLER_MULTIPLIER) % PARK_MILLER_MODULUS;
    const candidate = state.value - 1;
    if (candidate < limit) return candidate % bound;
  }
}

export function generateDeck(size: BoardSize, seed: number): readonly number[] {
  const cards = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  const random = { value: seed };
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const other = draw(random, index + 1);
    const held = cards[index];
    const swapped = cards[other];
    if (held === undefined || swapped === undefined) throw new Error('Invalid shuffle index');
    cards[index] = swapped;
    cards[other] = held;
  }
  return Object.freeze(cards);
}

export function parseBoardCode(text: string): Board | null {
  const match = /^np1-([1-9][0-9]*)-([1-9][0-9]*)$/.exec(text);
  if (match === null || match[0] !== text) return null;
  const sizeText = match[1];
  const seedText = match[2];
  if (sizeText === undefined || seedText === undefined) return null;
  const size = Number(sizeText);
  const seed = Number(seedText);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed < MIN_SEED || seed > MAX_SEED) return null;
  return Object.freeze({ code: `np1-${size}-${seed}`, size, seed, deck: generateDeck(size, seed) });
}

export function createBoardCode(size: BoardSize, seed: number): string {
  if (!Number.isSafeInteger(seed) || seed < MIN_SEED || seed > MAX_SEED) throw new RangeError('Invalid board seed');
  return `np1-${size}-${seed}`;
}
