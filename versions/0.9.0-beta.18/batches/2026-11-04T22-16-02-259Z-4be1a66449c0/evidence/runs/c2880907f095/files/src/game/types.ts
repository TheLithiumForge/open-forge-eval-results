import type { GRID_SIZES, SELECTION } from './constants.ts';

export type GridSize = typeof GRID_SIZES[number];
export type Board = Readonly<{
  code: string;
  size: GridSize;
  deck: readonly number[];
}>;
export type Selection =
  | Readonly<{ kind: typeof SELECTION.CLOSED }>
  | Readonly<{ kind: typeof SELECTION.ONE; index: number }>
  | Readonly<{ kind: typeof SELECTION.MISMATCH; first: number; second: number; remainingMs: number }>;
export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export type Snapshot = Readonly<{
  version: 1;
  boardCode: string;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;
