import { createBoard, type Board } from "./boardCode.js";

export type Selection =
  | { readonly kind: "closed" }
  | { readonly kind: "one"; readonly index: number }
  | {
      readonly kind: "mismatch";
      readonly first: number;
      readonly second: number;
      readonly remainingMs: number;
    };

export interface GameState {
  readonly board: Board;
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export function createGame(boardCode: string): GameState | null {
  const board = createBoard(boardCode);
  if (board === null) return null;
  return {
    board,
    matched: [],
    selection: { kind: "closed" },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
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
