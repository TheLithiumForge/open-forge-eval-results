import { makeDeck, parseBoardCode } from './boardCode.ts';
import type { Size } from './boardCode.ts';
export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED = 359999999;
export type Selection = { kind: 'closed' } | { kind: 'one'; index: number } | { kind: 'mismatch'; first: number; second: number; remainingMs: number };
export type GameState = { boardCode: string; size: Size; deck: readonly number[]; matched: readonly number[]; selection: Selection; moves: number; elapsedMs: number; started: boolean };
export function createGame(boardCode: string): GameState {
  const board = parseBoardCode(boardCode);
  if (!board) throw new Error('Invalid board code');
  return { boardCode, size: board.size, deck: makeDeck(board.size, board.seed), matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
}
export function isWon(state: GameState): boolean { return state.matched.length === state.deck.length; }
export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length || state.matched.includes(index) || isWon(state)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case 'mismatch': return state;
    case 'closed': return { ...state, started: true, selection: { kind: 'one', index } };
    case 'one': {
      if (selection.index === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.deck[selection.index] === state.deck[index]) return { ...state, moves, matched: [...state.matched, selection.index, index], selection: { kind: 'closed' } };
      return { ...state, moves, selection: { kind: 'mismatch', first: selection.index, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}
export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED, state.elapsedMs + milliseconds);
  const selection = state.selection.kind === 'mismatch'
    ? milliseconds >= state.selection.remainingMs ? { kind: 'closed' as const } : { ...state.selection, remainingMs: state.selection.remainingMs - milliseconds }
    : state.selection;
  return { ...state, elapsedMs, selection };
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
