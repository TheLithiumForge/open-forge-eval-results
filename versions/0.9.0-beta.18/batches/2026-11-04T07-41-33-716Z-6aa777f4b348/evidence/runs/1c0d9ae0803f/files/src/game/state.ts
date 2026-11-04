import { createBoard, type Board } from "./board.ts";
import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_DURATION_MS } from "./timing.ts";

export type Selection =
  | Readonly<{ kind: typeof SELECTION_KINDS.closed }>
  | Readonly<{ kind: typeof SELECTION_KINDS.one; index: number }>
  | Readonly<{ kind: typeof SELECTION_KINDS.mismatch; first: number; second: number; remainingMs: number }>;

export const SELECTION_KINDS = Object.freeze({ closed: "closed", one: "one", mismatch: "mismatch" });

export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

const CLOSED: Selection = Object.freeze({ kind: SELECTION_KINDS.closed });

export function createGame(boardCode: string): GameState | null {
  const board = createBoard(boardCode);
  return board ? Object.freeze({ board, matched: Object.freeze([]), selection: CLOSED,
    moves: 0, elapsedMs: 0, started: false }) : null;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function matchedPairs(state: GameState): number {
  return state.matched.length / 2;
}

function withMove(state: GameState): number {
  return Math.min(state.moves + 1, MAX_MOVES);
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isSafeInteger(index) || index < 0 || index >= state.board.deck.length || isWon(state)) return state;
  if (state.matched.includes(index)) return state;
  const started = true;
  switch (state.selection.kind) {
    case SELECTION_KINDS.closed:
      return Object.freeze({ ...state, started, selection: Object.freeze({ kind: SELECTION_KINDS.one, index }) });
    case SELECTION_KINDS.one: {
      if (index === state.selection.index) return state;
      const first = state.selection.index;
      const moves = withMove(state);
      if (state.board.deck[first] === state.board.deck[index]) {
        return Object.freeze({ ...state, started, moves,
          matched: Object.freeze([...state.matched, first, index]), selection: CLOSED });
      }
      return Object.freeze({ ...state, started, moves,
        selection: Object.freeze({ kind: SELECTION_KINDS.mismatch, first, second: index,
          remainingMs: MISMATCH_DURATION_MS }) });
    }
    case SELECTION_KINDS.mismatch:
      return state;
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || isWon(state)) return state;
  const elapsedMs = state.started
    ? milliseconds >= MAX_ELAPSED_MS - state.elapsedMs
      ? MAX_ELAPSED_MS
      : state.elapsedMs + milliseconds
    : state.elapsedMs;
  if (state.selection.kind === SELECTION_KINDS.mismatch) {
    if (milliseconds >= state.selection.remainingMs) {
      return Object.freeze({ ...state, elapsedMs, selection: CLOSED });
    }
    return Object.freeze({ ...state, elapsedMs,
      selection: Object.freeze({ ...state.selection, remainingMs: state.selection.remainingMs - milliseconds }) });
  }
  return elapsedMs === state.elapsedMs ? state : Object.freeze({ ...state, elapsedMs });
}
