import { generateDeck, parseBoardCode } from './boardCode.ts';
import type { BoardDescription } from './boardCode.ts';

export const SELECTION = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | { readonly kind: typeof SELECTION.closed }
  | { readonly kind: typeof SELECTION.one; readonly index: number }
  | { readonly kind: typeof SELECTION.mismatch; readonly first: number; readonly second: number; readonly remainingMs: number };

export interface GameState {
  readonly board: BoardDescription & { readonly deck: readonly number[] };
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
    board: Object.freeze({ ...board, deck: generateDeck(board) }),
    matched: [],
    selection: { kind: SELECTION.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
}

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}
