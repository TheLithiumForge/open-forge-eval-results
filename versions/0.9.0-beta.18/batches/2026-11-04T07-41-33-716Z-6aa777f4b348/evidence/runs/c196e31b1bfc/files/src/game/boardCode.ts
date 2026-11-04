export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type BoardSize = (typeof BOARD_SIZES)[number];
export const PARK_MILLER_MODULUS = 2_147_483_647;
export const MAX_SEED = PARK_MILLER_MODULUS - 1;

export interface BoardDescription {
  readonly code: string;
  readonly size: BoardSize;
  readonly seed: number;
  readonly deck: readonly number[];
}

export function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === "number" && BOARD_SIZES.some((size) => size === value);
}

export function parseBoardCode(input: string): BoardDescription | null {
  const code = input;
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (match === null) return null;
  const sizeText = match[1];
  const seedText = match[2];
  if (sizeText === undefined || seedText === undefined) return null;
  const size = Number(sizeText);
  const seed = Number(seedText);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code, size, seed, deck: generateDeck(size, seed) });
}

export function formatBoardCode(size: BoardSize, seed: number): string | null {
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed < 1 || seed > MAX_SEED) return null;
  return `np1-${size}-${seed}`;
}

export function generateDeck(size: BoardSize, seed: number): readonly number[] {
  const deck: number[] = [];
  for (let face = 0; face < (size * size) / 2; face += 1) deck.push(face, face);
  let state = seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const bound = index + 1;
    const limit = Math.floor((PARK_MILLER_MODULUS - 1) / bound) * bound;
    let value = limit;
    while (value >= limit) {
      state = nextParkMillerState(state);
      value = state - 1;
    }
    const swap = value % bound;
    const current = deck[index];
    const target = deck[swap];
    if (current !== undefined && target !== undefined) {
      deck[index] = target;
      deck[swap] = current;
    }
  }
  return Object.freeze(deck);
}

export function nextParkMillerState(state: number): number {
  return (state * 16_807) % PARK_MILLER_MODULUS;
}
