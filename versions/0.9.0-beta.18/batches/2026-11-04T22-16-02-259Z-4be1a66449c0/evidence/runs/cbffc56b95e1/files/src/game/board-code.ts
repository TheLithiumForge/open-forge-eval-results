import { BOARD_CODE_VERSION, SUPPORTED_SIZES, type BoardSize, isBoardSize } from "./constants.ts";

const PARK_MILLER_MODULUS = 2_147_483_647;
const PARK_MILLER_RANGE = PARK_MILLER_MODULUS - 1;

export interface BoardDescription {
  readonly code: string;
  readonly size: BoardSize;
  readonly seed: number;
}

export function parseBoardCode(input: string): BoardDescription | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(input);
  if (match === null) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > PARK_MILLER_RANGE) return null;
  return Object.freeze({ code: `${BOARD_CODE_VERSION}-${size}-${seed}`, size, seed });
}

export function createDeck(code: string): readonly number[] | null {
  const description = parseBoardCode(code);
  if (description === null) return null;
  const total = description.size * description.size;
  const deck = Array.from({ length: total }, (_, index) => Math.floor(index / 2));
  let state = description.seed;
  const draw = (bound: number): number => {
    const limit = Math.floor(PARK_MILLER_RANGE / bound) * bound;
    while (true) {
      state = (state * 16_807) % PARK_MILLER_MODULUS;
      const value = state - 1;
      if (value < limit) return value % bound;
    }
  };
  for (let index = total - 1; index > 0; index -= 1) {
    const other = draw(index + 1);
    [deck[index], deck[other]] = [deck[other]!, deck[index]!];
  }
  return Object.freeze(deck);
}

export function createBoardCode(size: BoardSize, seed: number): string {
  if (!Number.isSafeInteger(seed) || seed < 1 || seed > PARK_MILLER_RANGE) {
    throw new RangeError("Seed must be between 1 and 2147483646.");
  }
  return `${BOARD_CODE_VERSION}-${size}-${seed}`;
}

export function supportedBoardSizes(): readonly BoardSize[] {
  return SUPPORTED_SIZES;
}
