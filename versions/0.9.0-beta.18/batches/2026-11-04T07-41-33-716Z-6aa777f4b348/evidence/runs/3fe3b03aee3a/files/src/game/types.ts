export const GAME_LIMITS = Object.freeze({
  mismatchMs: 800,
  maxMoves: 999_999,
  maxElapsedMs: 359_999_999,
  snapshotBytes: 65_536,
  replayBytes: 1_048_576,
  replayActions: 10_000
});

export const supportedSizes = [4, 6, 8, 10, 12, 14, 16] as const;
export type BoardSize = (typeof supportedSizes)[number];

export type Board = Readonly<{
  code: string;
  size: BoardSize;
  deck: readonly number[];
}>;

export const selectionKinds = Object.freeze({ closed: "closed", one: "one", mismatch: "mismatch" } as const);

export type Selection =
  | Readonly<{ kind: typeof selectionKinds.closed }>
  | Readonly<{ kind: typeof selectionKinds.one; index: number }>
  | Readonly<{ kind: typeof selectionKinds.mismatch; first: number; second: number; remainingMs: number }>;

export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export const closedSelection: Selection = Object.freeze({ kind: selectionKinds.closed });
