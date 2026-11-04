export const BOARD_VERSION = 'np1';
export const SUPPORTED_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type BoardSize = (typeof SUPPORTED_SIZES)[number];
export const MAX_SEED = 2147483646;
export type Board = Readonly<{ code: string; size: BoardSize; seed: number }>;

export function isBoardSize(value: unknown): value is BoardSize {
  return SUPPORTED_SIZES.some((size) => size === value);
}

export function parseBoardCode(text: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9]\d*)$/.exec(text);
  if (!match || match[0] !== text) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code: text, size, seed });
}
