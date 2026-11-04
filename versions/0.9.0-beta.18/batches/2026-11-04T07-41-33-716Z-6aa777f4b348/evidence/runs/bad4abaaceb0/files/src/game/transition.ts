import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SELECTION_KIND } from "./constants.ts";
import { createBoard } from "./boardCode.ts";
import { CLOSED_SELECTION, type GameState } from "./state.ts";

export function createGame(boardCode: string): GameState | null {
  const created = createBoard(boardCode);
  if (!created) return null;
  return {
    ...created,
    matched: [],
    selection: CLOSED_SELECTION,
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

function addMove(moves: number): number {
  return Math.min(MAX_MOVES, moves + 1);
}

export function activateCard(state: GameState, index: number): GameState {
  if (isWon(state) || !Number.isInteger(index) || index < 0 || index >= state.deck.length) return state;
  if (state.matched.includes(index) || state.selection.kind === SELECTION_KIND.mismatch) return state;

  const selection = state.selection;
  if (selection.kind === SELECTION_KIND.closed) {
    return { ...state, selection: { kind: SELECTION_KIND.one, index }, started: true };
  }
  if (selection.index === index) return state;

  const moves = addMove(state.moves);
  if (state.deck[selection.index] === state.deck[index]) {
    return {
      ...state,
      matched: [...state.matched, selection.index, index],
      selection: CLOSED_SELECTION,
      moves,
      started: true,
    };
  }
  return {
    ...state,
    selection: { kind: SELECTION_KIND.mismatch, first: selection.index, second: index, remainingMs: MISMATCH_MS },
    moves,
    started: true,
  };
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  if (state.selection.kind !== SELECTION_KIND.mismatch) return { ...state, elapsedMs };

  const remainingMs = state.selection.remainingMs - milliseconds;
  if (remainingMs <= 0) return { ...state, elapsedMs, selection: CLOSED_SELECTION };
  return { ...state, elapsedMs, selection: { ...state.selection, remainingMs } };
}

export function formatTime(elapsedMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
