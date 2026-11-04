export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export const BOARD_CODE_VERSION = 1;
export const SNAPSHOT_VERSION = 1;
export const REPLAY_VERSION = 1;
export const MISMATCH_DURATION_MS = 800;
export const MAX_ELAPSED_MS = 359_999_999;
export const MAX_MOVES = 999_999;
export const MAX_BOARD_SEED = 2_147_483_646;
export const MAX_SNAPSHOT_BYTES = 65_536;
export const MAX_REPLAY_BYTES = 1_048_576;
export const MAX_REPLAY_ACTIONS = 10_000;
export const SELECTION_KIND = Object.freeze({ CLOSED: 'closed', ONE: 'one', MISMATCH: 'mismatch' });

export type BoardSize = (typeof BOARD_SIZES)[number];
