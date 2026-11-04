import { isWon, SELECTION } from './state.ts';
import type { GameState } from './state.ts';

export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length || state.matched.includes(index)) return state;
  switch (state.selection.kind) {
    case SELECTION.mismatch: return state;
    case SELECTION.closed:
      if (isWon(state)) return state;
      return { ...state, started: true, selection: { kind: SELECTION.one, index } };
    case SELECTION.one: {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      return state.board.deck[first] === state.board.deck[index]
        ? { ...state, moves, matched: [...state.matched, first, index], selection: { kind: SELECTION.closed } }
        : { ...state, moves, selection: { kind: SELECTION.mismatch, first, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  const selection = state.selection.kind === SELECTION.mismatch
    ? milliseconds >= state.selection.remainingMs
      ? { kind: SELECTION.closed }
      : { ...state.selection, remainingMs: state.selection.remainingMs - milliseconds }
    : state.selection;
  if (elapsedMs === state.elapsedMs && selection === state.selection) return state;
  return { ...state, elapsedMs, selection };
}
