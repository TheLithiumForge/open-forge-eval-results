import { isWon, SELECTION_KIND } from './state.ts';
import type { GameState } from './state.ts';

export const MOVE_CAP = 999_999;
export const ELAPSED_CAP = 359_999_999;
export const MISMATCH_MS = 800;

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length ||
      isWon(state) || state.matched.includes(index)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case SELECTION_KIND.closed:
      return { ...state, started: true, selection: { kind: SELECTION_KIND.one, index } };
    case SELECTION_KIND.one: {
      if (selection.index === index) return state;
      const moves = Math.min(MOVE_CAP, state.moves + 1);
      if (state.deck[selection.index] === state.deck[index]) {
        return { ...state, moves, matched: [...state.matched, selection.index, index],
          selection: { kind: SELECTION_KIND.closed } };
      }
      return { ...state, moves, selection: { kind: SELECTION_KIND.mismatch,
        first: selection.index, second: index, remainingMs: MISMATCH_MS } };
    }
    case SELECTION_KIND.mismatch:
      return state;
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(ELAPSED_CAP, state.elapsedMs + milliseconds);
  const selection = state.selection;
  if (selection.kind === SELECTION_KIND.mismatch) {
    const remainingMs = selection.remainingMs - milliseconds;
    return { ...state, elapsedMs, selection: remainingMs > 0
      ? { ...selection, remainingMs } : { kind: SELECTION_KIND.closed } };
  }
  return elapsedMs === state.elapsedMs ? state : { ...state, elapsedMs };
}
