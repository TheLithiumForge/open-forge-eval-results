import { isWon, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SELECTION } from './model.ts';
import type { GameState, Selection } from './model.ts';

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length ||
      state.matched.includes(index) || isWon(state)) return state;
  switch (state.selection.kind) {
    case SELECTION.closed:
      return { ...state, started: true, selection: { kind: SELECTION.one, index } };
    case SELECTION.one: {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.board.deck[first] === state.board.deck[index]) {
        return { ...state, moves, matched: [...state.matched, first, index],
          selection: { kind: SELECTION.closed } };
      }
      return { ...state, moves, selection: { kind: SELECTION.mismatch,
        first, second: index, remainingMs: MISMATCH_MS } };
    }
    case SELECTION.mismatch: return state;
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) {
    return state;
  }
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  const selection: Selection = state.selection.kind === SELECTION.mismatch
    ? milliseconds >= state.selection.remainingMs
      ? { kind: SELECTION.closed }
      : { ...state.selection, remainingMs: state.selection.remainingMs - milliseconds }
    : state.selection;
  return { ...state, elapsedMs, selection };
}
