import type { SUPPORTED_SIZES } from "./constants.ts";

export const SELECTION_KIND = Object.freeze({ CLOSED: "closed", ONE: "one", MISMATCH: "mismatch" } as const);
export type SelectionKind = (typeof SELECTION_KIND)[keyof typeof SELECTION_KIND];

export type GridSize = (typeof SUPPORTED_SIZES)[number];

export type BoardDescription = Readonly<{
  code: string;
  size: GridSize;
  seed: number;
  deck: readonly number[];
}>;

export type Selection =
  | Readonly<{ kind: typeof SELECTION_KIND.CLOSED }>
  | Readonly<{ kind: typeof SELECTION_KIND.ONE; index: number }>
  | Readonly<{ kind: typeof SELECTION_KIND.MISMATCH; first: number; second: number; remainingMs: number }>;

export type GameState = Readonly<{
  board: BoardDescription;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;
