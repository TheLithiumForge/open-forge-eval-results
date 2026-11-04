export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export const MAX_SEED = 2147483646;
export const MOVE_CAP = 999999;
export const TIME_CAP = 359999999;
export const MISMATCH_MS = 800;
export const SNAPSHOT_BYTE_LIMIT = 65536;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

export type BoardSize = (typeof SIZES)[number];

export function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === 'number' && SIZES.some((size) => size === value);
}
