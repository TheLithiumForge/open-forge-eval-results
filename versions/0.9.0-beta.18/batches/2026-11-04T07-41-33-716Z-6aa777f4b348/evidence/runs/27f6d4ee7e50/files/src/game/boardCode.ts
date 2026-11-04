export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;

export type BoardSize = (typeof BOARD_SIZES)[number];

export interface Board {
  readonly code: string;
  readonly size: BoardSize;
  readonly seed: number;
}

const MIN_SEED = 1;
const MAX_SEED = 2_147_483_646;
const CODE_PATTERN = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/;

export function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === "number" && BOARD_SIZES.some((size) => size === value);
}

export function parseBoardCode(text: string): Board | null {
  const match = CODE_PATTERN.exec(text);
  if (match === null || match[0] !== text) return null;
  const sizeText = match[1];
  const seedText = match[2];
  if (sizeText === undefined || seedText === undefined) return null;
  const size = Number(sizeText);
  const seed = Number(seedText);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed)) return null;
  if (seed < MIN_SEED || seed > MAX_SEED) return null;
  return Object.freeze({ code: text, size, seed });
}
