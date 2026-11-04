import { SELECTION_KIND, type GridSize } from "./constants.ts";

export type BoardDescription = Readonly<{
  code: string;
  size: GridSize;
  seed: number;
}>;

export type Selection =
  | Readonly<{ kind: typeof SELECTION_KIND.closed }>
  | Readonly<{ kind: typeof SELECTION_KIND.one; index: number }>
  | Readonly<{
      kind: typeof SELECTION_KIND.mismatch;
      first: number;
      second: number;
      remainingMs: number;
    }>;

export type GameState = Readonly<{
  board: BoardDescription;
  deck: readonly number[];
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export const CLOSED_SELECTION: Selection = { kind: SELECTION_KIND.closed };

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}
