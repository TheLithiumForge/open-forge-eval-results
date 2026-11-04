import { ELAPSED_LIMIT, MISMATCH_DURATION, MOVE_LIMIT, isMatched, isWon, type GameState } from "./state.ts";

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length || isWon(state)) return state;
  if (isMatched(state, index) || state.selection.kind === "mismatch") return state;
  if (state.selection.kind === "closed") {
    return Object.freeze({ ...state, started: true, selection: Object.freeze({ kind: "one", index }) });
  }
  if (state.selection.index === index) return state;
  const first = state.selection.index;
  const moves = Math.min(MOVE_LIMIT, state.moves + 1);
  if (state.board.deck[first] === state.board.deck[index]) {
    return Object.freeze({
      ...state,
      matched: Object.freeze([...state.matched, first, index]),
      selection: Object.freeze({ kind: "closed" }),
      moves,
    });
  }
  return Object.freeze({
    ...state,
    selection: Object.freeze({ kind: "mismatch", first, second: index, remainingMs: MISMATCH_DURATION }),
    moves,
  });
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) return state;
  if (isWon(state) || !state.started) return state;
  const elapsedMs = Math.min(ELAPSED_LIMIT, state.elapsedMs + milliseconds);
  if (state.selection.kind !== "mismatch") {
    if (elapsedMs === state.elapsedMs) return state;
    return Object.freeze({ ...state, elapsedMs });
  }
  const remainingMs = state.selection.remainingMs - milliseconds;
  if (remainingMs <= 0) {
    return Object.freeze({ ...state, elapsedMs, selection: Object.freeze({ kind: "closed" }) });
  }
  if (elapsedMs === state.elapsedMs && remainingMs === state.selection.remainingMs) return state;
  return Object.freeze({ ...state, elapsedMs, selection: Object.freeze({ ...state.selection, remainingMs }) });
}
