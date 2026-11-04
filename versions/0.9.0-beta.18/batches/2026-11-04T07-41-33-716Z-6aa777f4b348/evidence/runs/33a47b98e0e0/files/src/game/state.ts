import { generateDeck, parseBoardCode, type BoardDescription } from './board.ts';

export const SELECTION_KINDS = ['closed', 'one', 'mismatch'] as const;
export type SelectionKind = (typeof SELECTION_KINDS)[number];

export interface ClosedSelection { readonly kind: 'closed' }
export interface OneSelection { readonly kind: 'one'; readonly index: number }
export interface MismatchSelection {
  readonly kind: 'mismatch';
  readonly first: number;
  readonly second: number;
  readonly remainingMs: number;
}
export type Selection = ClosedSelection | OneSelection | MismatchSelection;

export interface GameState {
  readonly board: BoardDescription;
  readonly deck: readonly number[];
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export const CLOSED_SELECTION: ClosedSelection = Object.freeze({ kind: 'closed' });
export const GAME_LIMITS = Object.freeze({
  mismatchMs: 800,
  maxMoves: 999_999,
  maxElapsedMs: 359_999_999,
});

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  if (board === null) return null;
  return Object.freeze({
    board,
    deck: generateDeck(board),
    matched: Object.freeze([]),
    selection: CLOSED_SELECTION,
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
}

export function matchedPairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function formatTime(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
