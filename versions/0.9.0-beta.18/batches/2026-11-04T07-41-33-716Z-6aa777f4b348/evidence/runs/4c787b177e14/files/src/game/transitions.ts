import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS } from "./constants.ts";
import { SELECTION_KIND, type GameState, type Selection } from "./types.ts";

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length && state.selection.kind === SELECTION_KIND.CLOSED;
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length) return state;
  if (isWon(state) || state.matched.includes(index) || state.selection.kind === SELECTION_KIND.MISMATCH) return state;
  if (state.selection.kind === SELECTION_KIND.CLOSED) {
    return Object.freeze({
      ...state,
      selection: Object.freeze({ kind: SELECTION_KIND.ONE, index }),
      started: true,
    });
  }
  if (state.selection.index === index) return state;
  const moves = Math.min(MAX_MOVES, state.moves + 1);
  if (state.board.deck[state.selection.index] === state.board.deck[index]) {
    const matched = Object.freeze([...state.matched, state.selection.index, index]);
    return Object.freeze({ ...state, matched, selection: Object.freeze({ kind: SELECTION_KIND.CLOSED }), moves, started: true });
  }
  const selection: Selection = Object.freeze({ kind: "mismatch", first: state.selection.index, second: index, remainingMs: MISMATCH_MS });
  return Object.freeze({ ...state, selection, moves, started: true });
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || isWon(state) || !state.started || milliseconds === 0) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  if (state.selection.kind !== SELECTION_KIND.MISMATCH) return Object.freeze({ ...state, elapsedMs });
  if (milliseconds >= state.selection.remainingMs) {
    return Object.freeze({ ...state, elapsedMs, selection: Object.freeze({ kind: SELECTION_KIND.CLOSED }) });
  }
  const selection: Selection = Object.freeze({ ...state.selection, remainingMs: state.selection.remainingMs - milliseconds });
  return Object.freeze({ ...state, elapsedMs, selection });
}
