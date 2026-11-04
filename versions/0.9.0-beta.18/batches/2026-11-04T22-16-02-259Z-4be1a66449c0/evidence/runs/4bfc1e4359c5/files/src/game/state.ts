import { parseBoardCode, type Board } from "./board-code.ts";

export const MOVE_LIMIT = 999_999;
export const ELAPSED_LIMIT = 359_999_999;
export const MISMATCH_DURATION = 800;

export type Selection =
  | Readonly<{ kind: "closed" }>
  | Readonly<{ kind: "one"; index: number }>
  | Readonly<{ kind: "mismatch"; first: number; second: number; remainingMs: number }>;
export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  if (!board) return null;
  return Object.freeze({
    board,
    matched: Object.freeze([]),
    selection: Object.freeze({ kind: "closed" }),
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function matchedPairs(state: GameState): number {
  return state.matched.length / 2;
}

export function isMatched(state: GameState, index: number): boolean {
  return state.matched.includes(index);
}

export function isRevealed(state: GameState, index: number): boolean {
  if (isMatched(state, index)) return true;
  if (state.selection.kind === "one") return state.selection.index === index;
  return state.selection.kind === "mismatch" &&
    (state.selection.first === index || state.selection.second === index);
}

export function formatTime(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
