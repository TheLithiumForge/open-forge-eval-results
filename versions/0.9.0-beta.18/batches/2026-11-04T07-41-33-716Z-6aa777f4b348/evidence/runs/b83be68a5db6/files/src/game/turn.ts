import { selectionKinds, isWon } from './state.ts';
import type { GameState } from './state.ts';

export const mismatchMs = 800;
export const moveCap = 999999;
export const elapsedCap = 359999999;

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length ||
    state.matched.includes(index) || isWon(state)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case selectionKinds.mismatch: return state;
    case selectionKinds.closed:
      return { ...state, started: true, selection: { kind: selectionKinds.one, index } };
    case selectionKinds.one: {
      if (selection.index === index) return state;
      const moves = Math.min(moveCap, state.moves + 1);
      if (state.board.deck[selection.index] === state.board.deck[index]) {
        return { ...state, moves, matched: [...state.matched, selection.index, index],
          selection: { kind: selectionKinds.closed } };
      }
      return { ...state, moves, selection: { kind: selectionKinds.mismatch,
        first: selection.index, second: index, remainingMs: mismatchMs } };
    }
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!state.started || isWon(state) || !Number.isFinite(milliseconds) || milliseconds <= 0) return state;
  const elapsedMs = Math.min(elapsedCap, state.elapsedMs + milliseconds);
  let selection = state.selection;
  if (selection.kind === selectionKinds.mismatch) {
    const remainingMs = selection.remainingMs - milliseconds;
    selection = remainingMs <= 0 ? { kind: selectionKinds.closed } : { ...selection, remainingMs };
  }
  return { ...state, elapsedMs, selection };
}
