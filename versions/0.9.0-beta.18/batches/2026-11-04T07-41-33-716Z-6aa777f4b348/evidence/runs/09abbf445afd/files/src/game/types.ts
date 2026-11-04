import { SELECTION_KIND, type BoardSize } from './constants.ts';

export type Board = Readonly<{
  code: string;
  size: BoardSize;
  deck: readonly number[];
}>;

export type Selection =
  | Readonly<{ kind: typeof SELECTION_KIND.CLOSED }>
  | Readonly<{ kind: typeof SELECTION_KIND.ONE; index: number }>
  | Readonly<{
      kind: typeof SELECTION_KIND.MISMATCH;
      first: number;
      second: number;
      remainingMs: number;
    }>;

export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export type BoardCode = Readonly<{ size: BoardSize; seed: number; code: string }>;
