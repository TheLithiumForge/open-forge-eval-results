import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_DURATION_MS, SELECTION_KIND } from './constants.ts';
import { parseBoardCode } from './boardCode.ts';
import { generateDeck } from './deck.ts';
import type { Board, GameState, Selection } from './types.ts';

const CLOSED: Selection = Object.freeze({ kind: SELECTION_KIND.CLOSED });

export function createGame(boardCode: string): GameState | null {
  const parsed = parseBoardCode(boardCode);
  if (parsed === null) return null;
  const board: Board = Object.freeze({ code: parsed.code, size: parsed.size, deck: generateDeck(parsed) });
  return Object.freeze({ board, matched: Object.freeze([]), selection: CLOSED, moves: 0, elapsedMs: 0, started: false });
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

function containsMatched(state: GameState, index: number): boolean {
  return state.matched.includes(index);
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length || isWon(state)) return state;
  if (state.selection.kind === SELECTION_KIND.MISMATCH || containsMatched(state, index)) return state;
  if (state.selection.kind === SELECTION_KIND.CLOSED) {
    return Object.freeze({ ...state, selection: Object.freeze({ kind: SELECTION_KIND.ONE, index }), started: true });
  }
  const { index: first } = state.selection;
  if (first === index) return state;
  const moves = Math.min(MAX_MOVES, state.moves + 1);
  if (state.board.deck[first] === state.board.deck[index]) {
    return Object.freeze({
      ...state,
      matched: Object.freeze([...state.matched, first, index]),
      selection: CLOSED,
      moves,
    });
  }
  return Object.freeze({
    ...state,
    selection: Object.freeze({ kind: SELECTION_KIND.MISMATCH, first, second: index, remainingMs: MISMATCH_DURATION_MS }),
    moves,
  });
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || isWon(state) || !state.started) return state;
  const delta = milliseconds;
  if (delta <= 0) return state;
  const elapsedMs = state.elapsedMs + Math.min(delta, MAX_ELAPSED_MS - state.elapsedMs);
  if (state.selection.kind !== SELECTION_KIND.MISMATCH) return Object.freeze({ ...state, elapsedMs });
  const remainingMs = state.selection.remainingMs - delta;
  if (remainingMs <= 0) return Object.freeze({ ...state, elapsedMs, selection: CLOSED });
  return Object.freeze({ ...state, elapsedMs, selection: Object.freeze({ ...state.selection, remainingMs }) });
}
