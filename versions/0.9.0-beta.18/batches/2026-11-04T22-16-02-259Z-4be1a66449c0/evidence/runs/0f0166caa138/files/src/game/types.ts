export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type BoardSize = (typeof BOARD_SIZES)[number];

export type ClosedSelection = { readonly kind: "closed" };
export type OneSelection = {
  readonly kind: "one";
  readonly index: number;
};
export type MismatchSelection = {
  readonly kind: "mismatch";
  readonly first: number;
  readonly second: number;
  readonly remainingMs: number;
};
export type Selection = ClosedSelection | OneSelection | MismatchSelection;

export type GameState = {
  readonly boardCode: string;
  readonly size: BoardSize;
  readonly deck: readonly number[];
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
};

export const CLOSED: ClosedSelection = { kind: "closed" };
