import { CLOSED, MISMATCH_MS, MOVE_CAP, TIME_CAP_MS, type GameState } from './types.ts';
import { parseBoardCode } from './board/deal.ts';

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  if (!board) return null;
  return Object.freeze({ board, matched: Object.freeze([]), selection: CLOSED, moves: 0, elapsedMs: 0, started: false });
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length || isWon(state)) return state;
  if (state.selection.kind === 'mismatch') return state;
  if (state.matched.includes(index)) return state;
  if (state.selection.kind === 'closed') {
    return Object.freeze({ ...state, selection: Object.freeze({ kind: 'one', index }), started: true });
  }
  if (state.selection.index === index) return state;
  return secondReveal(state, index);
}

function secondReveal(state: GameState, index: number): GameState {
  const first = state.selection.kind === 'one' ? state.selection.index : index;
  const moves = Math.min(MOVE_CAP, state.moves + 1);
  if (state.board.deck[first] === state.board.deck[index]) {
    const matched = Object.freeze([...state.matched, first, index].sort((a, b) => a - b));
    return Object.freeze({ ...state, matched, selection: CLOSED, moves, started: true });
  }
  return Object.freeze({
    ...state,
    selection: Object.freeze({ kind: 'mismatch', first, second: index, remainingMs: MISMATCH_MS }),
    moves,
    started: true,
  });
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || !state.started || isWon(state) || milliseconds === 0) return state;
  const elapsedMs = Math.min(TIME_CAP_MS, state.elapsedMs + milliseconds);
  if (state.selection.kind !== 'mismatch') return Object.freeze({ ...state, elapsedMs });
  const { first, second, remainingMs } = state.selection;
  if (milliseconds < remainingMs) {
    return Object.freeze({ ...state, elapsedMs, selection: Object.freeze({ kind: 'mismatch', first, second, remainingMs: remainingMs - milliseconds }) });
  }
  return Object.freeze({ ...state, elapsedMs, selection: CLOSED });
}
