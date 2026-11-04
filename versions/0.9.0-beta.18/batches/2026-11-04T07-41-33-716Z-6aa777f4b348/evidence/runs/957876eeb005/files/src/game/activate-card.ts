import { CLOSED, MISMATCH_MS, SELECTION_KINDS } from './selection.ts';
import type { GameState } from './state.ts';

export const MOVE_CAP = 999999;

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length || state.matched.includes(index)) {
    return state;
  }
  const selection = state.selection;
  switch (selection.kind) {
    case SELECTION_KINDS.closed:
      return { ...state, started: true, selection: { kind: SELECTION_KINDS.one, index } };
    case SELECTION_KINDS.one: {
      if (selection.index === index) return state;
      const moves = Math.min(state.moves + 1, MOVE_CAP);
      if (state.deck[selection.index] === state.deck[index]) {
        return { ...state, moves, matched: [...state.matched, selection.index, index], selection: CLOSED };
      }
      return {
        ...state,
        moves,
        selection: { kind: SELECTION_KINDS.mismatch, first: selection.index, second: index, remainingMs: MISMATCH_MS },
      };
    }
    case SELECTION_KINDS.mismatch:
      return state;
  }
}
