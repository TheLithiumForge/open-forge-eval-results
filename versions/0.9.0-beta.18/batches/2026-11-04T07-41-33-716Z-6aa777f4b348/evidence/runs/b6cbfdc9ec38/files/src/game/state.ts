import { parseBoardCode } from './boardCode.ts';
import type { BoardDescription } from './boardCode.ts';
import { generateDeck } from './deck.ts';

export const SELECTION_KINDS = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;

export type Selection =
  | { readonly kind: typeof SELECTION_KINDS.closed }
  | { readonly kind: typeof SELECTION_KINDS.one; readonly index: number }
  | {
    readonly kind: typeof SELECTION_KINDS.mismatch;
    readonly first: number;
    readonly second: number;
    readonly remainingMs: number;
  };

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
    board,
    deck: generateDeck(board),
    matched: [],
    selection: { kind: SELECTION_KINDS.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}
