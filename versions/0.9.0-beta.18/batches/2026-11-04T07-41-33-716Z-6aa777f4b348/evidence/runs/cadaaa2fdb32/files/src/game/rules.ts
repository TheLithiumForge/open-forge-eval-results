import { isWon, SELECTION } from './state.ts';
import type { GameState } from './state.ts';

export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length ||
      state.matched.includes(index) || isWon(state)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case SELECTION.mismatch: return state;
    case SELECTION.closed:
      return { ...state, started: true, selection: { kind: SELECTION.one, index } };
    case SELECTION.one: {
      if (selection.index === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.deck[selection.index] === state.deck[index]) {
        return { ...state, moves, matched: [...state.matched, selection.index, index],
          selection: { kind: SELECTION.closed } };
      }
      return { ...state, moves, selection: { kind: SELECTION.mismatch,
        first: selection.index, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) {
    return state;
  }
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  const selection = state.selection;
  if (selection.kind !== SELECTION.mismatch) return { ...state, elapsedMs };
  return { ...state, elapsedMs, selection: milliseconds >= selection.remainingMs
    ? { kind: SELECTION.closed }
    : { ...selection, remainingMs: selection.remainingMs - milliseconds } };
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
