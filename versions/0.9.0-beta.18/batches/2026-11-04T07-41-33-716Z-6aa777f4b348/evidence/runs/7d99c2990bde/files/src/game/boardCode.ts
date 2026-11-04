export const boardSizes = [4, 6, 8, 10, 12, 14, 16] as const;
export type BoardSize = (typeof boardSizes)[number];
export const MAX_SEED = 2147483646;

export interface BoardDescription {
  readonly code: string;
  readonly size: BoardSize;
  readonly seed: number;
}

export function isBoardSize(value: unknown): value is BoardSize {
  return boardSizes.some(size => size === value);
}

export function parseBoardCode(code: string): BoardDescription | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match || match[0] !== code) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code, size, seed });
}
