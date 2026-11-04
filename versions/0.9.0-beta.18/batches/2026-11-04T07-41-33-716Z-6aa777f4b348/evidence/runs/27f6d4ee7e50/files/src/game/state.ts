import type { Board } from "./boardCode.ts";
import { parseBoardCode } from "./boardCode.ts";
import { createDeck } from "./deck.ts";

export const MISMATCH_DELAY_MS = 800;
export const MAX_MOVES = 999_999;
export const MAX_ELAPSED_MS = 359_999_999;
export const SELECTION_KINDS = Object.freeze({ closed: "closed", one: "one", mismatch: "mismatch" } as const);
export type SelectionKind = (typeof SELECTION_KINDS)[keyof typeof SELECTION_KINDS];

export type Selection =
  | { readonly kind: typeof SELECTION_KINDS.closed }
  | { readonly kind: typeof SELECTION_KINDS.one; readonly index: number }
  | { readonly kind: typeof SELECTION_KINDS.mismatch; readonly first: number; readonly second: number; readonly remainingMs: number };

export interface GameState {
  readonly board: Board;
  readonly deck: readonly number[];
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

const CLOSED: Selection = Object.freeze({ kind: "closed" });

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  if (board === null) return null;
  return Object.freeze({ board, deck: createDeck(board), matched: Object.freeze([]), selection: CLOSED,
    moves: 0, elapsedMs: 0, started: false });
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function matchedPairCount(state: GameState): number {
  return state.matched.length / 2;
}

function hasMatched(state: GameState, index: number): boolean {
  return state.matched.includes(index);
}

function withState(state: GameState, changes: Partial<GameState>): GameState {
  return Object.freeze({ ...state, ...changes });
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length || isWon(state)) return state;
  if (state.selection.kind === "mismatch" || hasMatched(state, index)) return state;

  if (state.selection.kind === "closed") {
    return withState(state, { selection: Object.freeze({ kind: "one", index }), started: true });
  }
  if (state.selection.kind !== "one" || state.selection.index === index) return state;

  const first = state.selection.index;
  const moves = Math.min(MAX_MOVES, state.moves + 1);
  if (state.deck[first] === state.deck[index]) {
    return withState(state, {
      selection: CLOSED,
      matched: Object.freeze([...state.matched, first, index]),
      moves,
      started: true,
    });
  }
  return withState(state, {
      selection: Object.freeze({ kind: "mismatch", first, second: index, remainingMs: MISMATCH_DELAY_MS }),
    moves,
    started: true,
  });
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return state;
  let selection = state.selection;
  if (selection.kind === "mismatch") {
    const remainingMs = selection.remainingMs - milliseconds;
    selection = remainingMs <= 0
      ? CLOSED
      : Object.freeze({ ...selection, remainingMs });
  }
  const elapsedMs = state.started && !isWon(state)
    ? Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds)
    : state.elapsedMs;
  if (selection === state.selection && elapsedMs === state.elapsedMs) return state;
  return withState(state, { selection, elapsedMs });
}
