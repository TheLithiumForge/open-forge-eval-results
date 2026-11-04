export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof SIZES)[number];
export const MAX_SEED = 2147483646;
export const BOARD_VERSION = 'np1';

export interface BoardDescription {
  readonly code: string;
  readonly size: Size;
  readonly seed: number;
}

export function isSize(value: unknown): value is Size {
  return SIZES.some(size => size === value);
}

export function parseBoardCode(code: unknown): BoardDescription | null {
  if (typeof code !== 'string') return null;
  const parts = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!parts || parts[0] !== code) return null;
  const size = Number(parts[1]);
  const seed = Number(parts[2]);
  if (!isSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code, size, seed });
}

export function boardCode(size: Size, seed: number): string {
  return `${BOARD_VERSION}-${size}-${seed}`;
}
