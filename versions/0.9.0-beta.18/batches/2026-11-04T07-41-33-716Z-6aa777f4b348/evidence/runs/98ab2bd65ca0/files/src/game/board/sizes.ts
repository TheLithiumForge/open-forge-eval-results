export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;

export type BoardSize = (typeof BOARD_SIZES)[number];

export function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === "number" && BOARD_SIZES.some((size) => size === value);
}
