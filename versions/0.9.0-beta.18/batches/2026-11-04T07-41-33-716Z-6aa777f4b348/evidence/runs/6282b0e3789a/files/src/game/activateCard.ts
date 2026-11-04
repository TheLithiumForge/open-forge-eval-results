import { isWon, MAX_MOVES, MISMATCH_MS } from './state.ts';
import type { GameState } from './state.ts';

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length ||
      state.matched.includes(index) || isWon(state)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case 'closed':
      return { ...state, started: true, selection: { kind: 'one', index } };
    case 'one': {
      if (selection.index === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.deck[selection.index] === state.deck[index]) {
        return { ...state, moves, matched: [...state.matched, selection.index, index], selection: { kind: 'closed' } };
      }
      return { ...state, moves, selection: { kind: 'mismatch', first: selection.index, second: index, remainingMs: MISMATCH_MS } };
    }
    case 'mismatch':
      return state;
  }
}
