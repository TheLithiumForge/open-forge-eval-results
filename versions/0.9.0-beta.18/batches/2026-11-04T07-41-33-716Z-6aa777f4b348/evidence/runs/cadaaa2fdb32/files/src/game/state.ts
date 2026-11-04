import { parseBoardCode } from './boardCode.ts';
import type { BoardDescription } from './boardCode.ts';
import { generateDeck } from './deck.ts';

export const SELECTION = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | { readonly kind: typeof SELECTION.closed }
  | { readonly kind: typeof SELECTION.one; readonly index: number }
  | { readonly kind: typeof SELECTION.mismatch; readonly first: number;
      readonly second: number; readonly remainingMs: number };

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
    board, deck: generateDeck(board), matched: [], selection: { kind: SELECTION.closed },
    moves: 0, elapsedMs: 0, started: false,
  } : null;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function isRevealed(state: GameState, index: number): boolean {
  if (state.matched.includes(index)) return true;
  const selection = state.selection;
  switch (selection.kind) {
    case SELECTION.closed: return false;
    case SELECTION.one: return selection.index === index;
    case SELECTION.mismatch: return selection.first === index || selection.second === index;
  }
}
