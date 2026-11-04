import { parseBoardCode } from './boardCode.ts';
import type { Board } from './boardCode.ts';

export const SELECTION = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;
export type Selection =
  | { readonly kind: typeof SELECTION.closed }
  | { readonly kind: typeof SELECTION.one; readonly index: number }
  | { readonly kind: typeof SELECTION.mismatch; readonly first: number;
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
  return board ? { board, matched: [], selection: { kind: SELECTION.closed },
    moves: 0, elapsedMs: 0, started: false } : null;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function isRevealed(state: GameState, index: number): boolean {
  if (state.matched.includes(index)) return true;
  switch (state.selection.kind) {
    case SELECTION.closed: return false;
    case SELECTION.one: return state.selection.index === index;
    case SELECTION.mismatch:
      return state.selection.first === index || state.selection.second === index;
  }
}
