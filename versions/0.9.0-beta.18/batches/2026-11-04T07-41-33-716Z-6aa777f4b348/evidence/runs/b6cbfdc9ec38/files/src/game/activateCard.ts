import { isWon, MAX_MOVES, MISMATCH_MS, SELECTION_KINDS } from './state.ts';
import type { GameState } from './state.ts';

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length
    || state.matched.includes(index) || isWon(state)) return state;
  switch (state.selection.kind) {
    case SELECTION_KINDS.mismatch:
      return state;
    case SELECTION_KINDS.closed:
      return { ...state, started: true, selection: { kind: SELECTION_KINDS.one, index } };
    case SELECTION_KINDS.one: {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.deck[first] === state.deck[index]) {
        return {
          ...state, moves, matched: [...state.matched, first, index],
          selection: { kind: SELECTION_KINDS.closed },
        };
      }
      return {
        ...state, moves,
        selection: { kind: SELECTION_KINDS.mismatch, first, second: index, remainingMs: MISMATCH_MS },
      };
    }
  }
}
