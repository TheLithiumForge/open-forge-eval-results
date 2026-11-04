import type { BoardDescription } from './boardCode.ts';

export const selectionKinds = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;

export type Selection =
  | { readonly kind: typeof selectionKinds.closed }
  | { readonly kind: typeof selectionKinds.one; readonly index: number }
  | {
      readonly kind: typeof selectionKinds.mismatch;
      readonly first: number;
      readonly second: number;
      readonly remainingMs: number;
    };

export interface GameState {
  readonly board: BoardDescription;
  readonly deck: readonly number[];
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function isCardRevealed(state: GameState, index: number): boolean {
  if (state.matched.includes(index)) return true;
  switch (state.selection.kind) {
    case selectionKinds.closed: return false;
    case selectionKinds.one: return state.selection.index === index;
    case selectionKinds.mismatch:
      return state.selection.first === index || state.selection.second === index;
  }
}
