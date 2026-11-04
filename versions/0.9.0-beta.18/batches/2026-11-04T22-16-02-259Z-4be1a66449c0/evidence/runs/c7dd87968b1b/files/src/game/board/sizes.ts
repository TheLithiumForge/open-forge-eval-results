export const GRID_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type GridSize = (typeof GRID_SIZES)[number];

export function isGridSize(value: unknown): value is GridSize {
  return typeof value === 'number' && GRID_SIZES.some((size) => size === value);
}
