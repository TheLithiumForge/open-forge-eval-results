import { createBoard } from './boardCode.ts';
import type { Board } from './boardCode.ts';

export const MOVE_CAP = 999999;
export const TIME_CAP = 359999999;
export const MISMATCH_MS = 800;
export const SELECTION = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | Readonly<{ kind: typeof SELECTION.closed }>
  | Readonly<{ kind: typeof SELECTION.one; index: number }>
  | Readonly<{ kind: typeof SELECTION.mismatch; first: number; second: number; remainingMs: number }>;
export type GameState = Readonly<{
  board: Board;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export function createGame(boardCode: string): GameState | null {
  const board = createBoard(boardCode);
  return board ? { board, matched: [], selection: { kind: SELECTION.closed }, moves: 0,
    elapsedMs: 0, started: false } : null;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length ||
      state.matched.includes(index) || isWon(state)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case SELECTION.mismatch: return state;
    case SELECTION.closed:
      return { ...state, started: true, selection: { kind: SELECTION.one, index } };
    case SELECTION.one: {
      if (selection.index === index) return state;
      const moves = Math.min(MOVE_CAP, state.moves + 1);
      if (state.board.deck[index] === state.board.deck[selection.index]) {
        return { ...state, moves, matched: [...state.matched, selection.index, index],
          selection: { kind: SELECTION.closed } };
      }
      return { ...state, moves, selection: { kind: SELECTION.mismatch,
        first: selection.index, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  let selection = state.selection;
  if (selection.kind === SELECTION.mismatch) {
    selection = milliseconds >= selection.remainingMs ? { kind: SELECTION.closed }
      : { ...selection, remainingMs: selection.remainingMs - milliseconds };
  }
  return { ...state, selection, elapsedMs: Math.min(TIME_CAP, state.elapsedMs + milliseconds) };
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
