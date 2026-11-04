import { CLOSED, MISMATCH, MAX_ELAPSED_MS, isWon } from './state.ts';
import type { GameState, Selection } from './state.ts';

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!state.started || isWon(state) || !Number.isFinite(milliseconds) || milliseconds <= 0) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  const selection: Selection = state.selection.kind !== MISMATCH ? state.selection
    : milliseconds >= state.selection.remainingMs ? { kind: CLOSED }
    : { ...state.selection, remainingMs: state.selection.remainingMs - milliseconds };
  return { ...state, elapsedMs, selection };
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
