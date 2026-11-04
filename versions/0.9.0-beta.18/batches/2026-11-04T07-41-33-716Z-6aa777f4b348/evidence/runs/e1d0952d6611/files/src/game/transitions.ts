import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SELECTION_KIND, CLOSED_SELECTION,
  type GameState } from './state.ts';

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

function isIndex(state: GameState, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < state.board.deck.length;
}

function isMatched(state: GameState, index: number): boolean {
  return state.matched.includes(index);
}

export function activateCard(state: GameState, index: number): GameState {
  if (!isIndex(state, index) || isWon(state) || state.selection.kind === SELECTION_KIND.mismatch ||
      isMatched(state, index)) return state;
  if (state.selection.kind === SELECTION_KIND.closed) {
    return { ...state, selection: { kind: SELECTION_KIND.one, index }, started: true };
  }
  if (state.selection.index === index) return state;
  const moves = Math.min(MAX_MOVES, state.moves + 1);
  const first = state.selection.index;
  if (state.board.deck[first] === state.board.deck[index]) {
    return { ...state, matched: [...state.matched, first, index], selection: CLOSED_SELECTION, moves };
  }
  return { ...state, selection: { kind: SELECTION_KIND.mismatch, first, second: index,
    remainingMs: MISMATCH_MS }, moves };
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  if (state.selection.kind !== SELECTION_KIND.mismatch) return { ...state, elapsedMs };
  const remainingMs = state.selection.remainingMs - milliseconds;
  if (remainingMs <= 0) return { ...state, elapsedMs, selection: CLOSED_SELECTION };
  return { ...state, elapsedMs, selection: { ...state.selection, remainingMs } };
}
