export const GRID_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type GridSize = (typeof GRID_SIZES)[number];

export const SNAPSHOT_VERSION = 1;
export const REPLAY_VERSION = 1;
export const MAX_SEED = 2_147_483_646;
export const MAX_MOVES = 999_999;
export const MAX_ELAPSED_MS = 359_999_999;
export const MISMATCH_MS = 800;
export const MAX_SNAPSHOT_BYTES = 65_536;
export const MAX_REPLAY_BYTES = 1_048_576;
export const MAX_REPLAY_ACTIONS = 10_000;

export const SELECTION_KIND = {
  closed: "closed",
  one: "one",
  mismatch: "mismatch",
} as const;

export const REPLAY_KEYS = ["version", "boardCode", "actions", "endMs"] as const;
export const ACTION_KEYS = ["atMs", "index"] as const;
export const SNAPSHOT_KEYS = [
  "version",
  "boardCode",
  "matched",
  "selection",
  "moves",
  "elapsedMs",
  "started",
] as const;
