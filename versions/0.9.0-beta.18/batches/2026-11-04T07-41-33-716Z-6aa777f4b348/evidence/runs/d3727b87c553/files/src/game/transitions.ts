import { isWon, SELECTION } from './state.ts';
import type { GameState } from './state.ts';

export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;
export const MISMATCH_MS = 800;

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isSafeInteger(index) || index < 0 || index >= state.board.deck.length ||
      state.matched.includes(index) || isWon(state)) return state;
  switch (state.selection.kind) {
    case SELECTION.closed:
      return { ...state, selection: { kind: SELECTION.one, index }, started: true };
    case SELECTION.one: {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.board.deck[first] === state.board.deck[index]) {
        return { ...state, moves, matched: [...state.matched, first, index], selection: { kind: SELECTION.closed } };
      }
      return { ...state, moves, selection: { kind: SELECTION.mismatch, first, second: index, remainingMs: MISMATCH_MS } };
    }
    case SELECTION.mismatch:
      return state;
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!state.started || isWon(state) || !Number.isFinite(milliseconds) || milliseconds <= 0) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  switch (state.selection.kind) {
    case SELECTION.closed:
    case SELECTION.one:
      return elapsedMs === state.elapsedMs ? state : { ...state, elapsedMs };
    case SELECTION.mismatch: {
      const remainingMs = state.selection.remainingMs - milliseconds;
      const selection = remainingMs <= 0
        ? { kind: SELECTION.closed }
        : { ...state.selection, remainingMs };
      return { ...state, elapsedMs, selection };
    }
  }
}
