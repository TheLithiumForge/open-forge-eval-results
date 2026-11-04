import { makeDeck, parseBoardCode } from './deck.ts';
import type { Size } from './deck.ts';
export const MAX_MOVES = 999999, MAX_TIME = 359999999, MISMATCH_MS = 800;
export type Selection = { kind: 'closed' } | { kind: 'one'; index: number } | { kind: 'mismatch'; first: number; second: number; remainingMs: number };
export type GameState = { readonly boardCode: string; readonly size: Size; readonly deck: readonly number[]; readonly matched: readonly number[]; readonly selection: Selection; readonly moves: number; readonly elapsedMs: number; readonly started: boolean };
export function createGame(code: string): GameState | null {
  const board = parseBoardCode(code);
  if (!board) return null;
  return { boardCode: code, size: board.size, deck: makeDeck(board.size, board.seed), matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
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
      return state.deck[selection.index] === state.deck[index]
        ? { ...state, moves, matched: [...state.matched, selection.index, index], selection: { kind: 'closed' } }
        : { ...state, moves, selection: { kind: 'mismatch', first: selection.index, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}
export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!state.started || isWon(state) || milliseconds <= 0) return state;
  const selection = state.selection;
  return { ...state, elapsedMs: Math.min(MAX_TIME, state.elapsedMs + milliseconds), selection: selection.kind === 'mismatch'
    ? milliseconds >= selection.remainingMs ? { kind: 'closed' } : { ...selection, remainingMs: selection.remainingMs - milliseconds }
    : selection };
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
