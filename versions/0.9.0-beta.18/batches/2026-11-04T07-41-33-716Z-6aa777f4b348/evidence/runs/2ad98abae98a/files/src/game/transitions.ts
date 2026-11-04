import type { GameState } from './model.ts';

export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}
export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length ||
      state.matched.includes(index) || isWon(state)) return state;
  switch (state.selection.kind) {
    case 'mismatch': return state;
    case 'closed': return { ...state, started: true, selection: { kind: 'one', index } };
    case 'one': {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      return state.deck[first] === state.deck[index]
        ? { ...state, moves, matched: [...state.matched, first, index], selection: { kind: 'closed' } }
        : { ...state, moves, selection: { kind: 'mismatch', first, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}
export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!state.started || isWon(state) || !Number.isFinite(milliseconds) || milliseconds <= 0) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  if (state.selection.kind !== 'mismatch') return { ...state, elapsedMs };
  const remainingMs = state.selection.remainingMs - milliseconds;
  return { ...state, elapsedMs, selection: remainingMs <= 0 ? { kind: 'closed' }
    : { ...state.selection, remainingMs } };
}
export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
