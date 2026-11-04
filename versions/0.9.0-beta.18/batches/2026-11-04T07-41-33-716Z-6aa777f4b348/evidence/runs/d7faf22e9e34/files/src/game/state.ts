import { parseBoardCode } from './boardCode.ts';
import type { BoardDescription } from './boardCode.ts';
import { generateDeck } from './deck.ts';

export const SELECTION_KIND = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | { readonly kind: typeof SELECTION_KIND.closed }
  | { readonly kind: typeof SELECTION_KIND.one; readonly index: number }
  | { readonly kind: typeof SELECTION_KIND.mismatch; readonly first: number;
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
  if (!board) return null;
  return {
    board, deck: generateDeck(board), matched: [], selection: { kind: SELECTION_KIND.closed },
    moves: 0, elapsedMs: 0, started: false,
  };
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}
