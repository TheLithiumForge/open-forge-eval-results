import type { Board } from './board.ts';

export const MISMATCH_MS = 800;
export const MAX_MOVES = 999_999;
export const MAX_ELAPSED_MS = 359_999_999;
export const SELECTION_KIND = Object.freeze({ closed: 'closed', one: 'one', mismatch: 'mismatch' } as const);
export type SelectionKind = (typeof SELECTION_KIND)[keyof typeof SELECTION_KIND];

export interface ClosedSelection {
  readonly kind: typeof SELECTION_KIND.closed;
}

export interface OneSelection {
  readonly kind: typeof SELECTION_KIND.one;
  readonly index: number;
}

export interface MismatchSelection {
  readonly kind: typeof SELECTION_KIND.mismatch;
  readonly first: number;
  readonly second: number;
  readonly remainingMs: number;
}

export type Selection = {
  [SELECTION_KIND.closed]: ClosedSelection;
  [SELECTION_KIND.one]: OneSelection;
  [SELECTION_KIND.mismatch]: MismatchSelection;
}[SelectionKind];

export interface GameState {
  readonly board: Board;
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export const CLOSED_SELECTION: ClosedSelection = Object.freeze({ kind: SELECTION_KIND.closed });

export function makeGameState(
  board: Board,
  matched: readonly number[] = [],
  selection: Selection = CLOSED_SELECTION,
  moves = 0,
  elapsedMs = 0,
  started = false
): GameState {
  return Object.freeze({
    board,
    matched: Object.freeze([...matched]),
    selection: Object.freeze({ ...selection }),
    moves,
    elapsedMs,
    started
  });
}
