import { CLOSED_SELECTION, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SELECTION_KIND } from './state.ts';
import type { GameState } from './state.ts';
import { makeGameState } from './state.ts';

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isSafeInteger(index) || index < 0 || index >= state.board.deck.length || isWon(state) || state.matched.includes(index)) return state;
  switch (state.selection.kind) {
    case SELECTION_KIND.closed:
      return makeGameState(state.board, state.matched, { kind: SELECTION_KIND.one, index }, state.moves, state.elapsedMs, true);
    case SELECTION_KIND.one: {
      if (state.selection.index === index) return state;
      const nextMoves = Math.min(MAX_MOVES, state.moves + 1);
      const firstFace = state.board.deck[state.selection.index];
      const nextFace = state.board.deck[index];
      if (firstFace === nextFace) {
        return makeGameState(state.board, [...state.matched, state.selection.index, index], CLOSED_SELECTION, nextMoves, state.elapsedMs, true);
      }
      return makeGameState(state.board, state.matched, {
        kind: SELECTION_KIND.mismatch, first: state.selection.index, second: index, remainingMs: MISMATCH_MS
      }, nextMoves, state.elapsedMs, true);
    }
    case SELECTION_KIND.mismatch:
      return state;
    default: {
      const unreachable: never = state.selection;
      return unreachable;
    }
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || isWon(state) || !state.started || milliseconds === 0) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  switch (state.selection.kind) {
    case SELECTION_KIND.closed:
    case SELECTION_KIND.one:
      return elapsedMs === state.elapsedMs ? state : makeGameState(state.board, state.matched, state.selection, state.moves, elapsedMs, state.started);
    case SELECTION_KIND.mismatch:
      if (milliseconds < state.selection.remainingMs) {
        return makeGameState(state.board, state.matched, {
          ...state.selection, remainingMs: state.selection.remainingMs - milliseconds
        }, state.moves, elapsedMs, state.started);
      }
      return makeGameState(state.board, state.matched, CLOSED_SELECTION, state.moves, elapsedMs, state.started);
    default: {
      const unreachable: never = state.selection;
      return unreachable;
    }
  }
}
