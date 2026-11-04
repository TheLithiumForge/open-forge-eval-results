import { MISMATCH_MS, SELECTION } from './selection.ts';
import { MAX_MOVES } from './state.ts';
import type { GameState } from './state.ts';

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length) return state;
  if (state.matched.includes(index)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case SELECTION.mismatch:
      return state;
    case SELECTION.closed:
      return { ...state, started: true, selection: { kind: SELECTION.one, index } };
    case SELECTION.one: {
      if (selection.index === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.board.deck[selection.index] === state.board.deck[index]) {
        return {
          ...state, moves, matched: [...state.matched, selection.index, index],
          selection: { kind: SELECTION.closed },
        };
      }
      return {
        ...state, moves,
        selection: {
          kind: SELECTION.mismatch, first: selection.index, second: index,
          remainingMs: MISMATCH_MS,
        },
      };
    }
  }
}
