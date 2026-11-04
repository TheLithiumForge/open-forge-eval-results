import { generateBoard, parseBoardCode, type Board } from './deal.ts';

export const MAX_MOVES = 999_999;
export const MAX_ELAPSED_MS = 359_999_999;
export const MISMATCH_MS = 800;

export const SELECTION_KIND = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | Readonly<{ kind: typeof SELECTION_KIND.closed }>
  | Readonly<{ kind: typeof SELECTION_KIND.one; index: number }>
  | Readonly<{ kind: typeof SELECTION_KIND.mismatch; first: number; second: number; remainingMs: number }>;

export const CLOSED_SELECTION: Selection = { kind: SELECTION_KIND.closed };
export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export function createGame(boardCode: string): GameState | null {
  const parsed = parseBoardCode(boardCode);
  if (parsed === null) return null;
  return { board: generateBoard(parsed), matched: [], selection: CLOSED_SELECTION,
    moves: 0, elapsedMs: 0, started: false };
}
