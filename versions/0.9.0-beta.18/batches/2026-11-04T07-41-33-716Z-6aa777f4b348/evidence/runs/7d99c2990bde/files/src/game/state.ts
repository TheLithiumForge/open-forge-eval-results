import { parseBoardCode } from './boardCode.ts';
import type { BoardDescription } from './boardCode.ts';
import { generateDeck } from './deck.ts';

export const selectionKinds = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | { readonly kind: typeof selectionKinds.closed }
  | { readonly kind: typeof selectionKinds.one; readonly index: number }
  | { readonly kind: typeof selectionKinds.mismatch; readonly first: number;
      readonly second: number; readonly remainingMs: number };

export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;
export const MISMATCH_MS = 800;

export interface GameState {
  readonly board: BoardDescription;
  readonly deck: readonly number[];
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  return board ? {
    board, deck: generateDeck(board), matched: [], selection: { kind: selectionKinds.closed },
    moves: 0, elapsedMs: 0, started: false,
  } : null;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function isRevealed(state: GameState, index: number): boolean {
  if (state.matched.includes(index)) return true;
  switch (state.selection.kind) {
    case selectionKinds.closed: return false;
    case selectionKinds.one: return state.selection.index === index;
    case selectionKinds.mismatch:
      return state.selection.first === index || state.selection.second === index;
  }
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length ||
      state.matched.includes(index) || isWon(state)) return state;
  switch (state.selection.kind) {
    case selectionKinds.mismatch: return state;
    case selectionKinds.closed:
      return { ...state, started: true, selection: { kind: selectionKinds.one, index } };
    case selectionKinds.one: {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      return state.deck[first] === state.deck[index]
        ? { ...state, moves, matched: [...state.matched, first, index],
            selection: { kind: selectionKinds.closed } }
        : { ...state, moves,
            selection: { kind: selectionKinds.mismatch, first, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  let selection = state.selection;
  if (selection.kind === selectionKinds.mismatch) {
    selection = milliseconds >= selection.remainingMs
      ? { kind: selectionKinds.closed }
      : { ...selection, remainingMs: selection.remainingMs - milliseconds };
  }
  return { ...state, selection, elapsedMs: Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds) };
}
