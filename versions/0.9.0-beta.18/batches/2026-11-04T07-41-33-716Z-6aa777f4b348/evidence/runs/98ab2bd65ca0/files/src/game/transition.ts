import {
  CLOSED_SELECTION,
  SELECTION_KINDS,
  isWon,
  type GameState,
} from "./state.ts";
import { MISMATCH_DURATION_MS } from "./clock.ts";

export const MAX_MOVES = 999999;

function isMatched(state: GameState, index: number): boolean {
  return state.matched.includes(index);
}

export function activateCard(state: GameState, index: number): GameState {
  if (
    !Number.isSafeInteger(index) ||
    index < 0 ||
    index >= state.board.deck.length ||
    isWon(state) ||
    isMatched(state, index)
  ) {
    return state;
  }

  const selection = state.selection;
  if (selection.kind === SELECTION_KINDS.mismatch) return state;

  if (selection.kind === SELECTION_KINDS.closed) {
    return Object.freeze({
      ...state,
      selection: Object.freeze({ kind: SELECTION_KINDS.one, index }),
      started: true,
    });
  }

  if (selection.index === index) return state;

  const moves = Math.min(MAX_MOVES, state.moves + 1);
  const firstFace = state.board.deck[selection.index];
  const secondFace = state.board.deck[index];

  if (firstFace === secondFace) {
    return Object.freeze({
      ...state,
      matched: Object.freeze([...state.matched, selection.index, index]),
      selection: CLOSED_SELECTION,
      moves,
    });
  }

  return Object.freeze({
    ...state,
    selection: Object.freeze({
      kind: SELECTION_KINDS.mismatch,
      first: selection.index,
      second: index,
      remainingMs: MISMATCH_DURATION_MS,
    }),
    moves,
  });
}
