import { CLOSED_SELECTION, isWon } from './state.ts';
import type { GameState } from './state.ts';

export const MAX_ELAPSED_MS = 359999999;

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  switch (state.selection.kind) {
    case 'closed':
    case 'one': return { ...state, elapsedMs };
    case 'mismatch': {
      const remainingMs = state.selection.remainingMs - milliseconds;
      return {
        ...state, elapsedMs,
        selection: remainingMs <= 0 ? CLOSED_SELECTION : { ...state.selection, remainingMs },
      };
    }
  }
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
