import { CLOSED, type GameState, type Selection } from "./types.ts";

export const MISMATCH_MS = 800;
export const MOVE_CAP = 999_999;
export const ELAPSED_CAP_MS = 359_999_999;

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function matchedPairs(state: GameState): number {
  return state.matched.length / 2;
}

export function activateCard(state: GameState, index: number): GameState {
  if (isWon(state) || state.selection.kind === "mismatch") return state;
  if (!Number.isSafeInteger(index) || index < 0 || index >= state.deck.length) return state;
  if (state.matched.includes(index)) return state;

  if (state.selection.kind === "closed") {
    return { ...state, selection: { kind: "one", index }, started: true };
  }
  if (state.selection.index === index) return state;

  const first = state.selection.index;
  const firstFace = state.deck[first];
  const secondFace = state.deck[index];
  if (firstFace === undefined || secondFace === undefined) return state;
  const moves = Math.min(MOVE_CAP, state.moves + 1);
  if (firstFace === secondFace) {
    return {
      ...state,
      matched: [...state.matched, first, index],
      selection: CLOSED,
      moves,
      started: true,
    };
  }
  return {
    ...state,
    selection: { kind: "mismatch", first, second: index, remainingMs: MISMATCH_MS },
    moves,
    started: true,
  };
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  const elapsed = Math.floor(Math.max(0, milliseconds));
  if (elapsed === 0 || !state.started || isWon(state)) return state;
  const elapsedMs = state.elapsedMs + Math.min(elapsed, ELAPSED_CAP_MS - state.elapsedMs);
  let selection: Selection = state.selection;
  if (selection.kind === "mismatch") {
    const remainingMs = selection.remainingMs - elapsed;
    selection = remainingMs > 0
      ? { ...selection, remainingMs }
      : CLOSED;
  }
  if (elapsedMs === state.elapsedMs && selection === state.selection) return state;
  return { ...state, elapsedMs, selection };
}
