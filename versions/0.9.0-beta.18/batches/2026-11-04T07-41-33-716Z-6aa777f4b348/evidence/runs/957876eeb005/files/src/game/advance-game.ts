import { isWon } from './is-won.ts';
import { CLOSED, SELECTION_KINDS } from './selection.ts';
import type { GameState } from './state.ts';

export const ELAPSED_CAP = 359999999;

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(ELAPSED_CAP, state.elapsedMs + milliseconds);
  const selection = state.selection;
  switch (selection.kind) {
    case SELECTION_KINDS.closed:
    case SELECTION_KINDS.one:
      return { ...state, elapsedMs };
    case SELECTION_KINDS.mismatch:
      return {
        ...state,
        elapsedMs,
        selection: milliseconds >= selection.remainingMs
          ? CLOSED
          : { ...selection, remainingMs: selection.remainingMs - milliseconds },
      };
  }
}
