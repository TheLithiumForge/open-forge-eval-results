import type { Board } from './boardCode.ts';

export const SELECTION_KINDS = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
type Closed = { readonly kind: typeof SELECTION_KINDS.closed };
type One = { readonly kind: typeof SELECTION_KINDS.one; readonly index: number };
type Mismatch = {
  readonly kind: typeof SELECTION_KINDS.mismatch;
  readonly first: number;
  readonly second: number;
  readonly remainingMs: number;
};
export type Selection = Closed | One | Mismatch;

export interface GameState {
  readonly board: Board;
  readonly deck: readonly number[];
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;
export const MISMATCH_MS = 800;

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}
