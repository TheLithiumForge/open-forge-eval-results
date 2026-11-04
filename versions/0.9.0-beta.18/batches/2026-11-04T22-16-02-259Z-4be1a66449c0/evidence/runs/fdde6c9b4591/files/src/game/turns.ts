import { generateDeck } from "./deck.ts";
import { MISMATCH_MS, MOVE_LIMIT, TIME_LIMIT_MS, type GameState, type Selection } from "./model.ts";
import { parseBoardCode } from "./boardCode.ts";

const CLOSED: Selection = Object.freeze({ kind: "closed" });

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  if (!board) return null;
  const deck = generateDeck(board);
  return {
    board: Object.freeze({ ...board, deck }),
    matched: [],
    selection: CLOSED,
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

function addMove(moves: number): number {
  return Math.min(MOVE_LIMIT, moves + 1);
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isSafeInteger(index) || index < 0 || index >= state.board.deck.length || isWon(state)) return state;
  if (state.selection.kind === "mismatch") return state;
  if (state.matched.includes(index)) return state;

  if (state.selection.kind === "closed") {
    return {
      ...state,
      selection: { kind: "one", index },
      started: true,
    };
  }

  const first = state.selection.index;
  if (first === index) return state;
  const moves = addMove(state.moves);
  if (state.board.deck[first] === state.board.deck[index]) {
    return {
      ...state,
      matched: Object.freeze([...state.matched, first, index]),
      selection: CLOSED,
      moves,
    };
  }
  return {
    ...state,
    selection: { kind: "mismatch", first, second: index, remainingMs: MISMATCH_MS },
    moves,
  };
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || isWon(state)) return state;
  const elapsedMs = state.started
    ? Math.min(TIME_LIMIT_MS, state.elapsedMs + milliseconds)
    : state.elapsedMs;
  if (state.selection.kind !== "mismatch") {
    return elapsedMs === state.elapsedMs ? state : { ...state, elapsedMs };
  }
  if (milliseconds >= state.selection.remainingMs) {
    return { ...state, selection: CLOSED, elapsedMs };
  }
  return {
    ...state,
    selection: { ...state.selection, remainingMs: state.selection.remainingMs - milliseconds },
    elapsedMs,
  };
}
