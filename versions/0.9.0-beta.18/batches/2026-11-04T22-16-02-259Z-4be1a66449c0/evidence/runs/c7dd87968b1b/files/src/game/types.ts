import type { GridSize } from './board/sizes.ts';

export type Board = Readonly<{
  boardCode: string;
  size: GridSize;
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

export const CLOSED_SELECTION: Selection = Object.freeze({ kind: 'closed' });
export const MOVE_LIMIT = 999_999;
export const TIME_LIMIT_MS = 359_999_999;
export const MISMATCH_MS = 800;
