import { isWon, MAX_ELAPSED_MS } from './state.ts';
import type { GameState, Selection } from './state.ts';

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  let selection: Selection = state.selection;
  switch (selection.kind) {
    case 'closed':
    case 'one':
      break;
    case 'mismatch':
      selection = milliseconds >= selection.remainingMs
        ? { kind: 'closed' }
        : { ...selection, remainingMs: selection.remainingMs - milliseconds };
      break;
  }
  return { ...state, elapsedMs, selection };
}
