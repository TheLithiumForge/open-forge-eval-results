import { KIND, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, isWon } from './state.ts';
import type { GameState } from './state.ts';

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length
    || state.matched.includes(index) || isWon(state)) return state;
  switch (state.selection.kind) {
    case KIND.closed:
      return { ...state, started: true, selection: { kind: KIND.one, index } };
    case KIND.one: {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      return state.board.deck[first] === state.board.deck[index]
        ? { ...state, moves, matched: [...state.matched, first, index], selection: { kind: KIND.closed } }
        : { ...state, moves, selection: { kind: KIND.mismatch, first, second: index, remainingMs: MISMATCH_MS } };
    }
    case KIND.mismatch: return state;
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!state.started || isWon(state) || !Number.isFinite(milliseconds) || milliseconds <= 0) return state;
  const delta = Math.floor(milliseconds);
  const elapsedMs = state.elapsedMs + Math.min(delta, MAX_ELAPSED_MS - state.elapsedMs);
  const selection = state.selection.kind !== KIND.mismatch ? state.selection
    : delta >= state.selection.remainingMs ? { kind: KIND.closed }
    : { ...state.selection, remainingMs: state.selection.remainingMs - delta };
  if (elapsedMs === state.elapsedMs && selection === state.selection) return state;
  return { ...state, elapsedMs, selection };
}
