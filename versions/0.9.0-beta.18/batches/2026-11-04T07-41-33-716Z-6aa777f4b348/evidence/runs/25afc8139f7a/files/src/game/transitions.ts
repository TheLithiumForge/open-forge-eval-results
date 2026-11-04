import { isWon, SELECTION_KINDS } from './state.ts';
import type { GameState } from './state.ts';

export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isSafeInteger(index) || index < 0 || index >= state.board.deck.length
    || state.matched.includes(index) || isWon(state)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case SELECTION_KINDS.closed:
      return { ...state, selection: { kind: SELECTION_KINDS.one, index }, started: true };
    case SELECTION_KINDS.one: {
      if (selection.index === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.board.deck[selection.index] === state.board.deck[index]) {
        return {
          ...state, moves,
          matched: [...state.matched, selection.index, index],
          selection: { kind: SELECTION_KINDS.closed },
        };
      }
      return {
        ...state, moves,
        selection: {
          kind: SELECTION_KINDS.mismatch, first: selection.index, second: index,
          remainingMs: MISMATCH_MS,
        },
      };
    }
    case SELECTION_KINDS.mismatch:
      return state;
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) {
    return state;
  }
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  const selection = state.selection;
  switch (selection.kind) {
    case SELECTION_KINDS.closed:
    case SELECTION_KINDS.one:
      return elapsedMs === state.elapsedMs ? state : { ...state, elapsedMs };
    case SELECTION_KINDS.mismatch:
      return {
        ...state, elapsedMs,
        selection: milliseconds >= selection.remainingMs
          ? { kind: SELECTION_KINDS.closed }
          : { ...selection, remainingMs: selection.remainingMs - milliseconds },
      };
  }
}
