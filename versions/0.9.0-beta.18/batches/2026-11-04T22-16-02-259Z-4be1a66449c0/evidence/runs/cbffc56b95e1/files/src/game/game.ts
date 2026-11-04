import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, type BoardSize } from "./constants.ts";
import { createDeck, parseBoardCode, type BoardDescription } from "./board-code.ts";

export type Selection =
  | { readonly kind: "closed" }
  | { readonly kind: "one"; readonly index: number }
  | { readonly kind: "mismatch"; readonly first: number; readonly second: number; readonly remainingMs: number };

export interface GameState {
  readonly board: BoardDescription;
  readonly deck: readonly number[];
  readonly matched: ReadonlySet<number>;
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  const deck = createDeck(boardCode);
  if (board === null || deck === null) return null;
  return { board, deck, matched: new Set<number>(), selection: { kind: "closed" }, moves: 0, elapsedMs: 0, started: false };
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length || isWon(state)) return state;
  if (state.selection.kind === "mismatch" || state.matched.has(index)) return state;
  if (state.selection.kind === "closed") {
    return { ...state, selection: { kind: "one", index }, started: true };
  }
  if (index === state.selection.index) return state;
  const first = state.selection.index;
  const moves = Math.min(MAX_MOVES, state.moves + 1);
  if (state.deck[first] === state.deck[index]) {
    const matched = new Set(state.matched);
    matched.add(first);
    matched.add(index);
    return { ...state, matched, selection: { kind: "closed" }, moves, started: true };
  }
  return { ...state, selection: { kind: "mismatch", first, second: index, remainingMs: MISMATCH_MS }, moves, started: true };
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const duration = Math.floor(milliseconds);
  if (duration <= 0) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + duration);
  if (state.selection.kind !== "mismatch") return { ...state, elapsedMs };
  if (duration >= state.selection.remainingMs) return { ...state, elapsedMs, selection: { kind: "closed" } };
  return { ...state, elapsedMs, selection: { ...state.selection, remainingMs: state.selection.remainingMs - duration } };
}

export function isWon(state: GameState): boolean {
  return state.matched.size === state.deck.length;
}

export function matchedPairs(state: GameState): number {
  return state.matched.size / 2;
}

export function boardTotalPairs(state: GameState): number {
  return state.deck.length / 2;
}

export function revealedIndices(state: GameState): ReadonlySet<number> {
  if (state.selection.kind === "one") return new Set([state.selection.index]);
  if (state.selection.kind === "mismatch") return new Set([state.selection.first, state.selection.second]);
  return new Set<number>();
}

export function currentSize(state: GameState): BoardSize {
  return state.board.size;
}
