import { createBoard } from './boardCode.ts';
import type { Board } from './boardCode.ts';

export const SELECTION = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | Readonly<{ kind: typeof SELECTION.closed }>
  | Readonly<{ kind: typeof SELECTION.one; index: number }>
  | Readonly<{ kind: typeof SELECTION.mismatch; first: number; second: number; remainingMs: number }>;
export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED = 359999999;
export type GameState = Readonly<{
  board: Board; matched: readonly number[]; selection: Selection;
  moves: number; elapsedMs: number; started: boolean;
}>;

export function createGame(code: string): GameState | null {
  const board = createBoard(code);
  return board ? { board, matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false } : null;
}

export function isWon(state: GameState): boolean { return state.matched.length === state.board.deck.length; }

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length || state.matched.includes(index)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case 'mismatch': return state;
    case 'closed': return { ...state, started: true, selection: { kind: 'one', index } };
    case 'one': {
      if (selection.index === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      return state.board.deck[selection.index] === state.board.deck[index]
        ? { ...state, moves, matched: [...state.matched, selection.index, index], selection: { kind: 'closed' } }
        : { ...state, moves, selection: { kind: 'mismatch', first: selection.index, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const delta = Math.floor(milliseconds);
  let selection = state.selection;
  if (selection.kind === 'mismatch') {
    selection = delta >= selection.remainingMs ? { kind: 'closed' }
      : { ...selection, remainingMs: selection.remainingMs - delta };
  }
  return { ...state, selection, elapsedMs: Math.min(MAX_ELAPSED, state.elapsedMs + delta) };
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
