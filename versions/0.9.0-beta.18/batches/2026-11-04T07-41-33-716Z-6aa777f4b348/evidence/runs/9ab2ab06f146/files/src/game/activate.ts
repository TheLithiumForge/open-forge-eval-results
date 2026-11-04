import { CLOSED, KIND, MAX_MOVES, MISMATCH_MS, isWon } from './state.ts';
import type { GameState } from './state.ts';

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length ||
      state.matched.includes(index) || isWon(state)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case KIND.closed:
      return { ...state, started: true, selection: { kind: KIND.one, index } };
    case KIND.one: {
      if (selection.index === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.board.deck[selection.index] === state.board.deck[index]) {
        return { ...state, moves, matched: [...state.matched, selection.index, index], selection: CLOSED };
      }
      return { ...state, moves, selection: {
        kind: KIND.mismatch, first: selection.index, second: index, remainingMs: MISMATCH_MS,
      } };
    }
    case KIND.mismatch:
      return state;
  }
}
