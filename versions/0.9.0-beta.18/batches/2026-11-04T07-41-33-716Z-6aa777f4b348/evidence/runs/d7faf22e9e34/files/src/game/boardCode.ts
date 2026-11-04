export const SIZES = Object.freeze([4, 6, 8, 10, 12, 14, 16] as const);
export type SupportedSize = (typeof SIZES)[number];
export const MAX_SEED = 2_147_483_646;

export interface BoardDescription {
  readonly boardCode: string;
  readonly size: SupportedSize;
  readonly seed: number;
}

export function isSupportedSize(value: unknown): value is SupportedSize {
  return typeof value === 'number' && SIZES.some((size) => size === value);
}

export function parseBoardCode(code: string): BoardDescription | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match || match[0] !== code || match[1] === undefined || match[2] === undefined) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isSupportedSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ boardCode: code, size, seed });
}
