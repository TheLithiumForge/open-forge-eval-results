import { CLOSED, ONE, MISMATCH, MISMATCH_MS, MAX_MOVES, isWon } from './state.ts';
import type { GameState } from './state.ts';

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length ||
      isWon(state) || state.matched.includes(index)) return state;
  switch (state.selection.kind) {
    case MISMATCH: return state;
    case CLOSED:
      return { ...state, started: true, selection: { kind: ONE, index } };
    case ONE: {
      const first = state.selection.index;
      if (index === first) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.board.deck[first] === state.board.deck[index]) {
        return { ...state, moves, matched: [...state.matched, first, index].sort((a, b) => a - b),
          selection: { kind: CLOSED } };
      }
      return { ...state, moves,
        selection: { kind: MISMATCH, first, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}
