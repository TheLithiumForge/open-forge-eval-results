import type { BoardCode } from "./board/code.ts";
import { generateDeck } from "./board/generate.ts";
import type { BoardSize } from "./board/sizes.ts";

export const SELECTION_KINDS = {
  closed: "closed",
  one: "one",
  mismatch: "mismatch",
} as const;

export interface ClosedSelection {
  readonly kind: typeof SELECTION_KINDS.closed;
}

export interface OneSelection {
  readonly kind: typeof SELECTION_KINDS.one;
  readonly index: number;
}

export interface MismatchSelection {
  readonly kind: typeof SELECTION_KINDS.mismatch;
  readonly first: number;
  readonly second: number;
  readonly remainingMs: number;
}

export type GameSelection = ClosedSelection | OneSelection | MismatchSelection;

export interface GameBoard {
  readonly code: string;
  readonly size: BoardSize;
  readonly deck: readonly number[];
}

export interface GameState {
  readonly board: GameBoard;
  readonly matched: readonly number[];
  readonly selection: GameSelection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export const CLOSED_SELECTION: ClosedSelection = Object.freeze({
  kind: SELECTION_KINDS.closed,
});

export function createGameFromCode(board: BoardCode): GameState {
  const gameBoard: GameBoard = Object.freeze({
    code: board.value,
    size: board.size,
    deck: generateDeck(board),
  });

  return Object.freeze({
    board: gameBoard,
    matched: Object.freeze([]),
    selection: CLOSED_SELECTION,
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
}

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}
