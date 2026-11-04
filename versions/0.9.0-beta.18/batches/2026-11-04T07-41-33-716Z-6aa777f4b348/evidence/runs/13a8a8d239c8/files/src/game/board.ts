export const GRID_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type GridSize = (typeof GRID_SIZES)[number];

export interface Board {
  readonly boardCode: string;
  readonly size: GridSize;
  readonly seed: number;
  readonly deck: readonly number[];
}

export const isGridSize = (value: unknown): value is GridSize =>
  typeof value === 'number' && GRID_SIZES.some((size) => size === value);

const MAX_SEED = 2_147_483_646;
const PARK_MILLER_MODULUS = 2_147_483_647;
const PARK_MILLER_MULTIPLIER = 16_807;
const RANDOM_VALUES = PARK_MILLER_MODULUS - 1;

export function parseBoardCode(boardCode: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(boardCode);
  if (match === null || match[0] !== boardCode) return null;
  const sizeText = match?.[1];
  const seedText = match?.[2];
  if (sizeText === undefined || seedText === undefined) return null;

  const size = Number(sizeText);
  const seed = Number(seedText);
  if (!isGridSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;

  const deck = generateDeck(size, seed);
  return Object.freeze({ boardCode, size, seed, deck });
}

function generateDeck(size: GridSize, seed: number): readonly number[] {
  const cards = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  let state = seed;

  for (let index = cards.length - 1; index > 0; index -= 1) {
    const bound = index + 1;
    const limit = Math.floor(RANDOM_VALUES / bound) * bound;
    let draw: number;
    do {
      state = (state * PARK_MILLER_MULTIPLIER) % PARK_MILLER_MODULUS;
      draw = state - 1;
    } while (draw >= limit);

    const other = draw % bound;
    const currentCard = cards[index];
    const otherCard = cards[other];
    if (currentCard === undefined || otherCard === undefined) {
      throw new Error('Shuffle index outside the deck.');
    }
    cards[index] = otherCard;
    cards[other] = currentCard;
  }

  return Object.freeze(cards);
}
