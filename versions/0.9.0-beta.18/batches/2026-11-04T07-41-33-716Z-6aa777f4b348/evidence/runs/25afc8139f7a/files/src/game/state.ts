import type { BoardDescription } from './boardCode.ts';
import { parseBoardCode } from './boardCode.ts';
import { generateDeck } from './deck.ts';

export const SELECTION_KINDS = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;

export type Selection =
  | Readonly<{ kind: typeof SELECTION_KINDS.closed }>
  | Readonly<{ kind: typeof SELECTION_KINDS.one; index: number }>
  | Readonly<{
      kind: typeof SELECTION_KINDS.mismatch;
      first: number;
      second: number;
      remainingMs: number;
    }>;

export type Board = BoardDescription & Readonly<{ deck: readonly number[] }>;
export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export function createGame(boardCode: string): GameState | null {
  const description = parseBoardCode(boardCode);
  if (!description) return null;
  return {
    board: Object.freeze({ ...description, deck: generateDeck(description) }),
    matched: [],
    selection: { kind: SELECTION_KINDS.closed },
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
