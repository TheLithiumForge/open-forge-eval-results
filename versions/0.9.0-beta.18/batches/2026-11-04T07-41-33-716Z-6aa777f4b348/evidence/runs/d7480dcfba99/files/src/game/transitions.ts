import { isWon, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS } from './state.ts';
import type { GameState } from './state.ts';

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length ||
      isWon(state) || state.matched.includes(index)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case 'closed':
      return { ...state, started: true, selection: { kind: 'one', index } };
    case 'one': {
      if (selection.index === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.board.deck[selection.index] === state.board.deck[index]) {
        return { ...state, moves, matched: [...state.matched, selection.index, index], selection: { kind: 'closed' } };
      }
      return { ...state, moves, selection: { kind: 'mismatch', first: selection.index, second: index, remainingMs: MISMATCH_MS } };
    }
    case 'mismatch': return state;
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  const selection = state.selection;
  switch (selection.kind) {
    case 'closed':
    case 'one': return { ...state, elapsedMs };
    case 'mismatch':
      return { ...state, elapsedMs, selection: milliseconds >= selection.remainingMs
        ? { kind: 'closed' }
        : { ...selection, remainingMs: selection.remainingMs - milliseconds } };
  }
}
