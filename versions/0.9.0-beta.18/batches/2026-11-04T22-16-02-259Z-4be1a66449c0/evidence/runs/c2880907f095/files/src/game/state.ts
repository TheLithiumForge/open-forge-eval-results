import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SELECTION } from './constants.ts';
import { parseBoardCode } from './board-code.ts';
import type { Board, GameState, Selection } from './types.ts';

const CLOSED: Selection = Object.freeze({ kind: SELECTION.CLOSED });

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  return board ? createGameFromBoard(board) : null;
}

export function createGameFromBoard(board: Board): GameState {
  return { board, matched: [], selection: CLOSED, moves: 0, elapsedMs: 0, started: false };
}

export function activateCard(state: GameState, index: number): GameState {
  if (isWon(state)) return state;
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length) return state;
  if (state.matched.includes(index)) return state;
  switch (state.selection.kind) {
    case SELECTION.CLOSED:
      return { ...state, selection: { kind: SELECTION.ONE, index }, started: true };
    case SELECTION.ONE: {
      if (state.selection.index === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      const first = state.selection.index;
      if (state.board.deck[first] === state.board.deck[index]) {
        return { ...state, matched: [...state.matched, first, index], selection: CLOSED, moves };
      }
      return { ...state, selection: { kind: SELECTION.MISMATCH, first, second: index, remainingMs: MISMATCH_MS }, moves };
    }
    case SELECTION.MISMATCH:
      return state;
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) return state;
  const elapsedMs = state.started && !isWon(state)
    ? Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds)
    : state.elapsedMs;
  let selection = state.selection;
  if (selection.kind === SELECTION.MISMATCH && milliseconds >= selection.remainingMs) {
    selection = CLOSED;
  } else if (selection.kind === SELECTION.MISMATCH) {
    selection = { ...selection, remainingMs: selection.remainingMs - milliseconds };
  }
  if (elapsedMs === state.elapsedMs && selection === state.selection) return state;
  return { ...state, elapsedMs, selection };
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}

