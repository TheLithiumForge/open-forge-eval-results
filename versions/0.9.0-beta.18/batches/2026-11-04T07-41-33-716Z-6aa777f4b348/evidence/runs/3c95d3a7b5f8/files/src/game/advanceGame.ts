import { SELECTION } from './selection.ts';
import { isWon, MAX_ELAPSED_MS } from './state.ts';
import type { GameState } from './state.ts';

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) {
    return state;
  }
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  const selection = state.selection;
  switch (selection.kind) {
    case SELECTION.closed:
    case SELECTION.one:
      return elapsedMs === state.elapsedMs ? state : { ...state, elapsedMs };
    case SELECTION.mismatch: {
      const remainingMs = selection.remainingMs - milliseconds;
      return {
        ...state, elapsedMs,
        selection: remainingMs <= 0
          ? { kind: SELECTION.closed }
          : { ...selection, remainingMs },
      };
    }
  }
}
