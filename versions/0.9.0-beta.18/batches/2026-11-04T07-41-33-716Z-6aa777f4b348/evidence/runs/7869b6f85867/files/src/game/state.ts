import { generateBoard } from './board-code.ts';
import type { Board } from './board-code.ts';

export const KIND = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;
export type Selection =
  | { readonly kind: typeof KIND.closed }
  | { readonly kind: typeof KIND.one; readonly index: number }
  | { readonly kind: typeof KIND.mismatch; readonly first: number;
      readonly second: number; readonly remainingMs: number };

export interface GameState {
  readonly board: Board;
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export function createGame(boardCode: string): GameState {
  return { board: generateBoard(boardCode), matched: [], selection: { kind: KIND.closed },
    moves: 0, elapsedMs: 0, started: false };
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function isRevealed(state: GameState, index: number): boolean {
  if (state.matched.includes(index)) return true;
  switch (state.selection.kind) {
    case KIND.closed: return false;
    case KIND.one: return state.selection.index === index;
    case KIND.mismatch: return state.selection.first === index || state.selection.second === index;
  }
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
