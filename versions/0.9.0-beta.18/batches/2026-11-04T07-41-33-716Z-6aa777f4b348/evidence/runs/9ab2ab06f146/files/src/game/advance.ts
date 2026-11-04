import { CLOSED, KIND, MAX_ELAPSED_MS, isWon } from './state.ts';
import type { GameState } from './state.ts';

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  const selection = state.selection;
  if (selection.kind !== KIND.mismatch) {
    return elapsedMs === state.elapsedMs ? state : { ...state, elapsedMs };
  }
  return { ...state, elapsedMs, selection: milliseconds >= selection.remainingMs
    ? CLOSED : { ...selection, remainingMs: selection.remainingMs - milliseconds } };
}
