import { CLOSED_SELECTION, MISMATCH_MS, MOVE_LIMIT, TIME_LIMIT_MS, type GameState } from './types.ts';

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length || isWon(state)) return state;
  if (state.selection.kind === 'mismatch' || state.matched.includes(index)) return state;
  if (state.selection.kind === 'closed') {
    return Object.freeze({ ...state, selection: Object.freeze({ kind: 'one', index }), started: true });
  }
  if (state.selection.index === index) return state;

  const moves = Math.min(MOVE_LIMIT, state.moves + 1);
  const firstFace = state.board.deck[state.selection.index];
  const secondFace = state.board.deck[index];
  if (firstFace === secondFace) {
    const matched = Object.freeze([...state.matched, state.selection.index, index]);
    return Object.freeze({ ...state, matched, selection: CLOSED_SELECTION, moves, started: true });
  }
  return Object.freeze({
    ...state,
    selection: Object.freeze({ kind: 'mismatch', first: state.selection.index, second: index, remainingMs: MISMATCH_MS }),
    moves,
    started: true,
  });
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (isWon(state) || !Number.isFinite(milliseconds) || milliseconds < 1) return state;
  const delta = Math.min(Number.MAX_SAFE_INTEGER, Math.floor(milliseconds));
  const elapsedMs = state.started ? Math.min(TIME_LIMIT_MS, state.elapsedMs + delta) : state.elapsedMs;
  if (state.selection.kind !== 'mismatch') {
    if (elapsedMs === state.elapsedMs) return state;
    return Object.freeze({ ...state, elapsedMs });
  }
  const remainingMs = state.selection.remainingMs - delta;
  if (remainingMs <= 0) return Object.freeze({ ...state, elapsedMs, selection: CLOSED_SELECTION });
  return Object.freeze({
    ...state,
    elapsedMs,
    selection: Object.freeze({ ...state.selection, remainingMs }),
  });
}
