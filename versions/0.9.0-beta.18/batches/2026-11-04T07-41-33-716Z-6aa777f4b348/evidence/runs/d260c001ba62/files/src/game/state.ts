import { parseBoardCode } from './boardCode.ts';
import type { Size } from './boardCode.ts';
import { generateDeck } from './deck.ts';

export const SELECTION = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | { readonly kind: typeof SELECTION.closed }
  | { readonly kind: typeof SELECTION.one; readonly index: number }
  | { readonly kind: typeof SELECTION.mismatch; readonly first: number; readonly second: number; readonly remainingMs: number };
export interface BoardDescription {
  readonly code: string;
  readonly size: Size;
  readonly seed: number;
  readonly deck: readonly number[];
}
export interface GameState {
  readonly board: BoardDescription;
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export function createGame(code: string): GameState | null {
  const board = parseBoardCode(code);
  if (!board) return null;
  return {
    board: Object.freeze({ ...board, deck: generateDeck(board.size, board.seed) }),
    matched: [], selection: { kind: SELECTION.closed }, moves: 0, elapsedMs: 0, started: false,
  };
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function isRevealed(state: GameState, index: number): boolean {
  if (state.matched.includes(index)) return true;
  switch (state.selection.kind) {
    case SELECTION.closed: return false;
    case SELECTION.one: return state.selection.index === index;
    case SELECTION.mismatch: return state.selection.first === index || state.selection.second === index;
  }
}
