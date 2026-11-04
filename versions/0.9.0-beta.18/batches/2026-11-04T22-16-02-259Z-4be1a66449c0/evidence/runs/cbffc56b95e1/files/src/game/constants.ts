export const SUPPORTED_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export const MAX_MOVES = 999_999;
export const MAX_ELAPSED_MS = 359_999_999;
export const MISMATCH_MS = 800;
export const BOARD_CODE_VERSION = "np1";
export const SNAPSHOT_VERSION = 1;
export const REPLAY_VERSION = 1;

export type BoardSize = (typeof SUPPORTED_SIZES)[number];

export function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === "number" && SUPPORTED_SIZES.some((size) => size === value);
}
