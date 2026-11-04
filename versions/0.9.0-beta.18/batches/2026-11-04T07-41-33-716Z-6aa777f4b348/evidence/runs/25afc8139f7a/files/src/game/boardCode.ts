export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type BoardSize = (typeof BOARD_SIZES)[number];
export const MAX_SEED = 2147483646;
export const BOARD_VERSION = 'np1';

export type BoardDescription = Readonly<{
  code: string;
  size: BoardSize;
  seed: number;
}>;

export function isBoardSize(value: unknown): value is BoardSize {
  return BOARD_SIZES.some((size) => size === value);
}

export function parseBoardCode(code: string): BoardDescription | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match || match[0] !== code) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code, size, seed });
}
