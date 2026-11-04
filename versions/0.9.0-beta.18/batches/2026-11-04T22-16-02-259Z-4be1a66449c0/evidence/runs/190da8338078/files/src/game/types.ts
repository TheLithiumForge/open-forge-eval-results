export const SUPPORTED_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
const SUPPORTED_SIZE_SET: ReadonlySet<number> = new Set(SUPPORTED_SIZES);
export const MAX_SEED = 2_147_483_646;
export const MOVE_CAP = 999_999;
export const TIME_CAP_MS = 359_999_999;
export const MISMATCH_MS = 800;

export type BoardSize = (typeof SUPPORTED_SIZES)[number];
export type Board = Readonly<{
  code: string;
  size: BoardSize;
  seed: number;
  deck: readonly number[];
}>;
export type Selection =
  | Readonly<{ kind: 'closed' }>
  | Readonly<{ kind: 'one'; index: number }>
  | Readonly<{ kind: 'mismatch'; first: number; second: number; remainingMs: number }>;
export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export const CLOSED: Selection = Object.freeze({ kind: 'closed' });

export function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === 'number' && SUPPORTED_SIZE_SET.has(value);
}
