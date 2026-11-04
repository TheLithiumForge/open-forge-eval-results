import { parseBoardCode } from './boardCode.ts';
import type { Board } from './boardCode.ts';
import { generateDeck } from './deck.ts';

export const SELECTION_KINDS = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | Readonly<{ kind: typeof SELECTION_KINDS.closed }>
  | Readonly<{ kind: typeof SELECTION_KINDS.one; index: number }>
  | Readonly<{ kind: typeof SELECTION_KINDS.mismatch; first: number; second: number; remainingMs: number }>;
export const CLOSED_SELECTION: Selection = Object.freeze({ kind: SELECTION_KINDS.closed });
export type GameState = Readonly<{
  board: Board;
  deck: readonly number[];
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  if (!board) return null;
  return {
    board, deck: generateDeck(board), matched: [], selection: CLOSED_SELECTION,
    moves: 0, elapsedMs: 0, started: false,
  };
}

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function isRevealed(state: GameState, index: number): boolean {
  if (state.matched.includes(index)) return true;
  switch (state.selection.kind) {
    case 'closed': return false;
    case 'one': return state.selection.index === index;
    case 'mismatch': return state.selection.first === index || state.selection.second === index;
  }
}
