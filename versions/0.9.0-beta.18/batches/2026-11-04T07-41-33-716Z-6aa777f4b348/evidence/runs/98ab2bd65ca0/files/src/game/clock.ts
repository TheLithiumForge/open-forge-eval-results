import {
  CLOSED_SELECTION,
  SELECTION_KINDS,
  isWon,
  type GameState,
} from "./state.ts";

export const MAX_ELAPSED_MS = 359999999;
export const MISMATCH_DURATION_MS = 800;

export function formatElapsedTime(elapsedMs: number): string {
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (
    !Number.isSafeInteger(milliseconds) ||
    milliseconds <= 0 ||
    !state.started ||
    isWon(state)
  ) {
    return state;
  }

  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  const selection = state.selection;

  if (selection.kind !== SELECTION_KINDS.mismatch) {
    return Object.freeze({ ...state, elapsedMs });
  }

  if (milliseconds >= selection.remainingMs) {
    return Object.freeze({ ...state, elapsedMs, selection: CLOSED_SELECTION });
  }

  return Object.freeze({
    ...state,
    elapsedMs,
    selection: Object.freeze({
      ...selection,
      remainingMs: selection.remainingMs - milliseconds,
    }),
  });
}
