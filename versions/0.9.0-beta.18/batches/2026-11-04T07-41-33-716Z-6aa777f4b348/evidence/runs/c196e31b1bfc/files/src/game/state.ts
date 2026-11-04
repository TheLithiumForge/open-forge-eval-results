import { parseBoardCode, type BoardDescription } from "./boardCode.ts";

export const MISMATCH_MS = 800;
export const MAX_ELAPSED_MS = 359_999_999;
export const MAX_MOVES = 999_999;
export const SELECTION_KINDS = { closed: "closed", one: "one", mismatch: "mismatch" } as const;
type SelectionKind = (typeof SELECTION_KINDS)[keyof typeof SELECTION_KINDS];

export type Selection =
  | { readonly kind: typeof SELECTION_KINDS.closed }
  | { readonly kind: typeof SELECTION_KINDS.one; readonly index: number }
  | { readonly kind: typeof SELECTION_KINDS.mismatch; readonly first: number; readonly second: number; readonly remainingMs: number };

export const isSelectionKind = (value: string): value is SelectionKind => Object.values(SELECTION_KINDS).some((kind) => kind === value);

export interface GameState {
  readonly boardCode: string;
  readonly size: BoardDescription["size"];
  readonly deck: readonly number[];
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  return board === null ? null : initialState(board);
}

export function initialState(board: BoardDescription): GameState {
  return {
    boardCode: board.code,
    size: board.size,
    deck: board.deck,
    matched: [],
    selection: { kind: "closed" },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length || isWon(state)) return state;
  if (state.selection.kind === "mismatch" || state.matched.includes(index)) return state;
  if (state.selection.kind === "closed") {
    return { ...state, selection: { kind: "one", index }, started: true };
  }
  if (state.selection.index === index) return state;
  const first = state.selection.index;
  const moves = Math.min(state.moves + 1, MAX_MOVES);
  if (state.deck[first] === state.deck[index]) {
    return { ...state, matched: [...state.matched, first, index], selection: { kind: "closed" }, moves, started: true };
  }
  return {
    ...state,
    selection: { kind: "mismatch", first, second: index, remainingMs: MISMATCH_MS },
    moves,
    started: true,
  };
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  if (state.selection.kind !== "mismatch" || milliseconds === 0) return { ...state, elapsedMs };
  if (milliseconds < state.selection.remainingMs) {
    return { ...state, elapsedMs, selection: { ...state.selection, remainingMs: state.selection.remainingMs - milliseconds } };
  }
  return { ...state, elapsedMs, selection: { kind: "closed" } };
}
