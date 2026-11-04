import type { Board } from './deck.ts';

export const SELECTION = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | Readonly<{ kind: typeof SELECTION.closed }>
  | Readonly<{ kind: typeof SELECTION.one; index: number }>
  | Readonly<{ kind: typeof SELECTION.mismatch; first: number; second: number; remainingMs: number }>;

export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;
export const MISMATCH_MS = 800;

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
