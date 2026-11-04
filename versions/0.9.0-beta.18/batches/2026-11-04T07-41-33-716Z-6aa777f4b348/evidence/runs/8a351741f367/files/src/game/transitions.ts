import { isWon } from './state.ts';
import type { GameState } from './state.ts';

export const MISMATCH_MS = 800;
export const MAX_MOVES = 999_999;
export const MAX_ELAPSED_MS = 359_999_999;

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length ||
      state.matched.includes(index)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case 'mismatch': return state;
    case 'closed': return { ...state, started: true, selection: { kind: 'one', index } };
    case 'one': {
      if (selection.index === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.deck[selection.index] === state.deck[index]) {
        return { ...state, moves, matched: [...state.matched, selection.index, index],
          selection: { kind: 'closed' } };
      }
      return { ...state, moves, selection: { kind: 'mismatch', first: selection.index,
        second: index, remainingMs: MISMATCH_MS } };
    }
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  const selection = state.selection;
  switch (selection.kind) {
    case 'closed':
    case 'one': return elapsedMs === state.elapsedMs ? state : { ...state, elapsedMs };
    case 'mismatch': return { ...state, elapsedMs, selection: milliseconds >= selection.remainingMs
      ? { kind: 'closed' }
      : { ...selection, remainingMs: selection.remainingMs - milliseconds } };
  }
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
