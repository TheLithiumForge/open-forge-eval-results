import type { Board } from './deal.ts';
import { parseBoardCode } from './deal.ts';

export const selectionKinds = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | { readonly kind: typeof selectionKinds.closed }
  | { readonly kind: typeof selectionKinds.one; readonly index: number }
  | { readonly kind: typeof selectionKinds.mismatch; readonly first: number;
      readonly second: number; readonly remainingMs: number };

export interface GameState {
  readonly board: Board;
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  return board ? { board, matched: [], selection: { kind: selectionKinds.closed },
    moves: 0, elapsedMs: 0, started: false } : null;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function isRevealed(state: GameState, index: number): boolean {
  if (state.matched.includes(index)) return true;
  switch (state.selection.kind) {
    case selectionKinds.closed: return false;
    case selectionKinds.one: return state.selection.index === index;
    case selectionKinds.mismatch:
      return state.selection.first === index || state.selection.second === index;
  }
}
