import { parseBoardCode } from './boardCode.ts';
import { generateBoard } from './deck.ts';
import type { Board } from './deck.ts';
import { CLOSED_SELECTION, MISMATCH_MS, SELECTION } from './selection.ts';
import type { Selection } from './selection.ts';

export const MAX_MOVES = 999_999;
export const MAX_ELAPSED_MS = 359_999_999;

export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export function createGame(boardCode: string): GameState | null {
  const description = parseBoardCode(boardCode);
  if (description === null) return null;
  return Object.freeze({
    board: generateBoard(description), matched: Object.freeze([]),
    selection: CLOSED_SELECTION, moves: 0, elapsedMs: 0, started: false,
  });
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function isRevealed(state: GameState, index: number): boolean {
  if (state.matched.includes(index)) return true;
  switch (state.selection.kind) {
    case SELECTION.closed: return false;
    case SELECTION.one: return state.selection.index === index;
    case SELECTION.mismatch: return state.selection.first === index || state.selection.second === index;
  }
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isSafeInteger(index) || index < 0 || index >= state.board.deck.length
    || state.matched.includes(index) || isWon(state)) return state;
  switch (state.selection.kind) {
    case SELECTION.mismatch: return state;
    case SELECTION.closed:
      return Object.freeze({ ...state, started: true, selection: Object.freeze({ kind: SELECTION.one, index }) });
    case SELECTION.one: {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.board.deck[first] === state.board.deck[index]) {
        return Object.freeze({ ...state, moves, selection: CLOSED_SELECTION,
          matched: Object.freeze([...state.matched, first, index]) });
      }
      return Object.freeze({ ...state, moves, selection: Object.freeze({
        kind: SELECTION.mismatch, first, second: index, remainingMs: MISMATCH_MS,
      }) });
    }
  }
}

// Fractional active milliseconds are retained; only serialization rounds them down.
export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  const selection = state.selection;
  switch (selection.kind) {
    case SELECTION.closed:
    case SELECTION.one:
      return elapsedMs === state.elapsedMs ? state : Object.freeze({ ...state, elapsedMs });
    case SELECTION.mismatch:
      return Object.freeze({ ...state, elapsedMs, selection: milliseconds >= selection.remainingMs
        ? CLOSED_SELECTION
        : Object.freeze({ ...selection, remainingMs: selection.remainingMs - milliseconds }) });
  }
}

export function formatTime(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
