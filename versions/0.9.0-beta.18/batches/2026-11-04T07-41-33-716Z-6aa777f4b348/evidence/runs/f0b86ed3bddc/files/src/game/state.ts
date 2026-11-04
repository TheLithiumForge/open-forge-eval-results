import { parseBoardCode } from './boardCode.ts';
import type { BoardCode } from './boardCode.ts';
import { generateDeck } from './deck.ts';

export const CLOSED = 'closed';
export const ONE = 'one';
export const MISMATCH = 'mismatch';
export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;
export type Selection =
  | Readonly<{ kind: typeof CLOSED }>
  | Readonly<{ kind: typeof ONE; index: number }>
  | Readonly<{ kind: typeof MISMATCH; first: number; second: number; remainingMs: number }>;
export type Board = BoardCode & Readonly<{ deck: readonly number[] }>;
export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export function createGame(boardCode: string): GameState {
  const parsed = parseBoardCode(boardCode);
  if (!parsed) throw new Error('Invalid board code.');
  return {
    board: Object.freeze({ ...parsed, deck: generateDeck(parsed) }),
    matched: [], selection: { kind: CLOSED }, moves: 0, elapsedMs: 0, started: false,
  };
}

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function isRevealed(state: GameState, index: number): boolean {
  if (state.matched.includes(index)) return true;
  switch (state.selection.kind) {
    case CLOSED: return false;
    case ONE: return state.selection.index === index;
    case MISMATCH: return state.selection.first === index || state.selection.second === index;
  }
}
