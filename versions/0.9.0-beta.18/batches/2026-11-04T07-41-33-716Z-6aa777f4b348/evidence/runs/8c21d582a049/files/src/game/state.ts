import { parseBoardCode } from './boardCode.ts';
import type { BoardDescription } from './boardCode.ts';
import { generateDeck } from './deck.ts';

export const SELECTION_KIND = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type SelectionKind = (typeof SELECTION_KIND)[keyof typeof SELECTION_KIND];
export type Selection =
  | { readonly kind: typeof SELECTION_KIND.closed }
  | { readonly kind: typeof SELECTION_KIND.one; readonly index: number }
  | { readonly kind: typeof SELECTION_KIND.mismatch; readonly first: number; readonly second: number; readonly remainingMs: number };
export interface Board extends BoardDescription { readonly deck: readonly number[] }
export interface GameState {
  readonly board: Board;
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}
export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;
export const CLOSED: Selection = Object.freeze({ kind: SELECTION_KIND.closed });

export function createGame(code: string): GameState | null {
  const description = parseBoardCode(code);
  if (!description) return null;
  const board = Object.freeze({ ...description, deck: generateDeck(description) });
  return { board, matched: [], selection: CLOSED, moves: 0, elapsedMs: 0, started: false };
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function pairCount(state: GameState): number { return state.matched.length / 2; }

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length ||
      state.matched.includes(index) || isWon(state)) return state;
  switch (state.selection.kind) {
    case SELECTION_KIND.closed:
      return { ...state, started: true, selection: { kind: SELECTION_KIND.one, index } };
    case SELECTION_KIND.one: {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.board.deck[first] === state.board.deck[index]) {
        return { ...state, moves, selection: CLOSED, matched: [...state.matched, first, index] };
      }
      return { ...state, moves, selection: {
        kind: SELECTION_KIND.mismatch, first, second: index, remainingMs: MISMATCH_MS,
      } };
    }
    case SELECTION_KIND.mismatch:
      return state;
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  switch (state.selection.kind) {
    case SELECTION_KIND.closed:
    case SELECTION_KIND.one:
      return { ...state, elapsedMs };
    case SELECTION_KIND.mismatch: {
      const remainingMs = state.selection.remainingMs - milliseconds;
      const selection: Selection = remainingMs <= 0 ? CLOSED : { ...state.selection, remainingMs };
      return { ...state, elapsedMs, selection };
    }
  }
}

export function formatTime(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
