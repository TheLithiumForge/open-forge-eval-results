import { parseBoard } from './deck.ts';
import type { Board } from './deck.ts';
export const MAX_TIME = 359999999, MAX_MOVES = 999999, MISMATCH_MS = 800;
export type Selection = { kind: 'closed' } | { kind: 'one'; index: number } | { kind: 'mismatch'; first: number; second: number; remainingMs: number };
export interface GameState { board: Board; matched: readonly number[]; selection: Selection; moves: number; elapsedMs: number; started: boolean }
export function createGame(code: string): GameState | null {
  const board = parseBoard(code);
  return board ? { board, matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false } : null;
}
export function isWon(state: GameState): boolean { return state.matched.length === state.board.deck.length; }
export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length || state.matched.includes(index) || isWon(state)) return state;
  switch (state.selection.kind) {
    case 'closed': return { ...state, started: true, selection: { kind: 'one', index } };
    case 'mismatch': return state;
    case 'one': {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.board.deck[first] === state.board.deck[index]) return { ...state, moves, matched: [...state.matched, first, index], selection: { kind: 'closed' } };
      return { ...state, moves, selection: { kind: 'mismatch', first, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}
export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!state.started || isWon(state) || milliseconds <= 0) return state;
  const elapsedMs = Math.min(MAX_TIME, state.elapsedMs + milliseconds);
  const selection = state.selection.kind === 'mismatch'
    ? milliseconds >= state.selection.remainingMs ? { kind: 'closed' } as const : { ...state.selection, remainingMs: state.selection.remainingMs - milliseconds }
    : state.selection;
  return { ...state, elapsedMs, selection };
}
export function formatTime(ms: number): string { const seconds = Math.floor(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
