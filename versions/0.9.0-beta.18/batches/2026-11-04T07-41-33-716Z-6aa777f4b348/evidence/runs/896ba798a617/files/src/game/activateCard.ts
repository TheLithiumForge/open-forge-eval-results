import { CLOSED_SELECTION, isWon } from './state.ts';
import type { GameState } from './state.ts';

export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length
    || state.matched.includes(index) || isWon(state)) return state;
  switch (state.selection.kind) {
    case 'closed':
      return { ...state, started: true, selection: { kind: 'one', index } };
    case 'one': {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.deck[first] === state.deck[index]) {
        return { ...state, moves, matched: [...state.matched, first, index], selection: CLOSED_SELECTION };
      }
      return {
        ...state, moves,
        selection: { kind: 'mismatch', first, second: index, remainingMs: MISMATCH_MS },
      };
    }
    case 'mismatch': return state;
  }
}
