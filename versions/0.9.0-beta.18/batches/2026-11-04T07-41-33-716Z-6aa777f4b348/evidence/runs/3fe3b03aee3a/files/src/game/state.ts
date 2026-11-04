import { GAME_LIMITS, closedSelection, type GameState, type Selection } from "./types.ts";

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

function addMove(moves: number): number {
  return Math.min(GAME_LIMITS.maxMoves, moves + 1);
}

function faceAt(state: GameState, index: number): number | undefined {
  return state.board.deck[index];
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length || isWon(state)) return state;
  if (state.matched.includes(index) || state.selection.kind === "mismatch") return state;

  if (state.selection.kind === "closed") {
    return { ...state, selection: { kind: "one", index }, started: true };
  }

  if (state.selection.index === index) return state;
  const first = state.selection.index;
  const second = index;
  const moves = addMove(state.moves);
  if (faceAt(state, first) === faceAt(state, second)) {
    return { ...state, matched: [...state.matched, first, second], selection: closedSelection, moves, started: true };
  }
  const selection: Selection = {
    kind: "mismatch", first, second, remainingMs: GAME_LIMITS.mismatchMs
  };
  return { ...state, selection, moves, started: true };
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError("Time must be finite and nonnegative.");
  if (milliseconds === 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(GAME_LIMITS.maxElapsedMs, state.elapsedMs + milliseconds);
  if (state.selection.kind !== "mismatch") return { ...state, elapsedMs };
  const remainingMs = state.selection.remainingMs - milliseconds;
  const selection = remainingMs <= 0
    ? closedSelection
    : { ...state.selection, remainingMs };
  return { ...state, elapsedMs, selection };
}
