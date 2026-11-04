export const SUPPORTED_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type GridSize = (typeof SUPPORTED_SIZES)[number];
export const MAX_SEED = 2147483646;

export interface Board {
  readonly code: string;
  readonly size: GridSize;
  readonly seed: number;
}

export function isGridSize(value: unknown): value is GridSize {
  return SUPPORTED_SIZES.some(size => size === value);
}

export function parseBoardCode(text: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(text);
  if (!match || match[0] !== text || match[1] === undefined || match[2] === undefined) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isGridSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code: text, size, seed });
}
