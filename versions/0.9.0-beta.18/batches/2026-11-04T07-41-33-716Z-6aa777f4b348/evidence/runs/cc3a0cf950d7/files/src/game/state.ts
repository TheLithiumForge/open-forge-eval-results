import { generateDeck, parseBoardCode } from './deal.ts';
import type { Board } from './deal.ts';

export const KINDS = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;
export type Selection =
  | { readonly kind: typeof KINDS.closed }
  | { readonly kind: typeof KINDS.one; readonly index: number }
  | { readonly kind: typeof KINDS.mismatch; readonly first: number;
      readonly second: number; readonly remainingMs: number };
export interface GameState {
  readonly board: Board;
  readonly deck: readonly number[];
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export function createGame(code: string): GameState | null {
  const board = parseBoardCode(code);
  return board ? { board, deck: generateDeck(board), matched: [],
    selection: { kind: KINDS.closed }, moves: 0, elapsedMs: 0, started: false } : null;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length ||
      state.matched.includes(index) || isWon(state)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case KINDS.mismatch: return state;
    case KINDS.closed:
      return { ...state, started: true, selection: { kind: KINDS.one, index } };
    case KINDS.one:
      if (selection.index === index) return state;
      return { ...state, moves: Math.min(MAX_MOVES, state.moves + 1),
        ...(state.deck[selection.index] === state.deck[index]
          ? { matched: [...state.matched, selection.index, index], selection: { kind: KINDS.closed } }
          : { selection: { kind: KINDS.mismatch, first: selection.index,
              second: index, remainingMs: MISMATCH_MS } }) };
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!state.started || isWon(state) || milliseconds <= 0 || !Number.isFinite(milliseconds)) return state;
  const delta = Math.floor(milliseconds);
  const selection = state.selection;
  return { ...state, elapsedMs: Math.min(MAX_ELAPSED_MS, state.elapsedMs + delta),
    selection: selection.kind !== KINDS.mismatch ? selection
      : delta >= selection.remainingMs ? { kind: KINDS.closed }
      : { ...selection, remainingMs: selection.remainingMs - delta } };
}

export function isRevealed(state: GameState, index: number): boolean {
  const selection = state.selection;
  return state.matched.includes(index) || (selection.kind === KINDS.one && selection.index === index) ||
    (selection.kind === KINDS.mismatch && (selection.first === index || selection.second === index));
}

export function formatTime(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
