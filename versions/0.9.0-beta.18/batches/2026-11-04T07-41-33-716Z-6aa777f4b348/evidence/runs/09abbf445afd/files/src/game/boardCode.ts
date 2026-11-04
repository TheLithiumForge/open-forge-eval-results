import { BOARD_SIZES, MAX_BOARD_SEED, type BoardSize } from './constants.ts';
import type { BoardCode } from './types.ts';

function isBoardSize(value: number): value is BoardSize {
  return BOARD_SIZES.some((size) => size === value);
}

export function parseBoardCode(value: string): BoardCode | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(value);
  if (match === null || match[0] !== value) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > MAX_BOARD_SEED) {
    return null;
  }
  return { code: value, size, seed };
}
