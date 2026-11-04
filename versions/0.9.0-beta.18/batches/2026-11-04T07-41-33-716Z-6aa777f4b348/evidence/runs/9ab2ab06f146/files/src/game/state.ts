import { createBoard } from './board.ts';
import type { Board } from './board.ts';

export const KIND = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export const CLOSED = Object.freeze({ kind: KIND.closed });
export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;
export type Selection =
  | typeof CLOSED
  | Readonly<{ kind: typeof KIND.one; index: number }>
  | Readonly<{ kind: typeof KIND.mismatch; first: number; second: number; remainingMs: number }>;
export type GameState = Readonly<{
  board: Board; matched: readonly number[]; selection: Selection;
  moves: number; elapsedMs: number; started: boolean;
}>;

export function createGame(boardCode: string): GameState | null {
  const board = createBoard(boardCode);
  return board ? { board, matched: [], selection: CLOSED, moves: 0, elapsedMs: 0, started: false } : null;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
