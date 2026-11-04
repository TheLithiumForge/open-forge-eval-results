export const GRID_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type GridSize = (typeof GRID_SIZES)[number];
export const MAX_SEED = 2147483646;

export interface BoardDescription {
  readonly code: string;
  readonly size: GridSize;
  readonly seed: number;
}

export function isGridSize(value: unknown): value is GridSize {
  return GRID_SIZES.some((size) => size === value);
}

export function parseBoardCode(code: string): BoardDescription | null {
  const parts = /^np1-(4|6|8|10|12|14|16)-([1-9]\d*)$/.exec(code);
  if (!parts || parts[0] !== code) return null;
  const size = Number(parts[1]);
  const seed = Number(parts[2]);
  if (!isGridSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code, size, seed });
}
