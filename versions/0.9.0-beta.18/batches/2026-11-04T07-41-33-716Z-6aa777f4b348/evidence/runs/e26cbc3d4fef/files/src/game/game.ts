import { parseBoardCode } from './boardCode.ts';
import { generateDeck } from './generation.ts';
import { isWon, selectionKinds } from './state.ts';
import type { GameState } from './state.ts';

export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;

export function createGame(boardCode: string): GameState {
  const board = parseBoardCode(boardCode);
  if (!board) throw new Error('Invalid board code.');
  return {
    board, deck: generateDeck(board), matched: [],
    selection: { kind: selectionKinds.closed }, moves: 0, elapsedMs: 0, started: false,
  };
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length
    || state.matched.includes(index) || isWon(state)) return state;
  switch (state.selection.kind) {
    case selectionKinds.closed:
      return { ...state, started: true, selection: { kind: selectionKinds.one, index } };
    case selectionKinds.one: {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.deck[first] === state.deck[index]) {
        return {
          ...state, moves, matched: [...state.matched, first, index],
          selection: { kind: selectionKinds.closed },
        };
      }
      return {
        ...state, moves,
        selection: { kind: selectionKinds.mismatch, first, second: index, remainingMs: MISMATCH_MS },
      };
    }
    case selectionKinds.mismatch:
      return state;
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  if (state.selection.kind !== selectionKinds.mismatch) return { ...state, elapsedMs };
  const remainingMs = state.selection.remainingMs - milliseconds;
  return {
    ...state, elapsedMs,
    selection: remainingMs <= 0
      ? { kind: selectionKinds.closed }
      : { ...state.selection, remainingMs },
  };
}
