import { generateDeck, parseBoardCode } from './deal.ts';
import type { Board } from './deal.ts';

export const SELECTION_KINDS = ['closed', 'one', 'mismatch'] as const;
export type SelectionKind = (typeof SELECTION_KINDS)[number];
export type Selection =
  | Readonly<{ kind: 'closed' }>
  | Readonly<{ kind: 'one'; index: number }>
  | Readonly<{ kind: 'mismatch'; first: number; second: number; remainingMs: number }>;
export type GameState = Readonly<{
  board: Board;
  deck: readonly number[];
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;
export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  return board ? {
    board, deck: generateDeck(board), matched: [], selection: { kind: 'closed' },
    moves: 0, elapsedMs: 0, started: false,
  } : null;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
