import { isWon, MAX_ELAPSED_MS, SELECTION_KINDS } from './state.ts';
import type { GameState, Selection } from './state.ts';

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!state.started || isWon(state) || !Number.isFinite(milliseconds) || milliseconds <= 0) return state;
  let selection: Selection;
  switch (state.selection.kind) {
    case SELECTION_KINDS.closed:
    case SELECTION_KINDS.one:
      selection = state.selection;
      break;
    case SELECTION_KINDS.mismatch:
      selection = milliseconds >= state.selection.remainingMs
        ? { kind: SELECTION_KINDS.closed }
        : { ...state.selection, remainingMs: state.selection.remainingMs - milliseconds };
      break;
  }
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  if (selection === state.selection && elapsedMs === state.elapsedMs) return state;
  return { ...state, elapsedMs, selection };
}
