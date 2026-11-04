import { generateBoard } from './deck.ts';
import { isWon, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS } from './model.ts';
import type { GameState, Selection } from './model.ts';

export function createGame(boardCode: string): GameState | null {
  const board = generateBoard(boardCode);
  return board ? { board, matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false } : null;
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length ||
      state.matched.includes(index) || isWon(state)) return state;
  const selection = state.selection;
  switch (selection.kind) {
    case 'mismatch': return state;
    case 'closed': return { ...state, started: true, selection: { kind: 'one', index } };
    case 'one': {
      if (selection.index === index) return state;
      const match = state.board.deck[selection.index] === state.board.deck[index];
      return {
        ...state,
        moves: Math.min(MAX_MOVES, state.moves + 1),
        matched: match ? [...state.matched, selection.index, index] : state.matched,
        selection: match ? { kind: 'closed' } : {
          kind: 'mismatch', first: selection.index, second: index, remainingMs: MISMATCH_MS,
        },
      };
    }
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!state.started || isWon(state) || !Number.isFinite(milliseconds) || milliseconds <= 0) return state;
  let selection: Selection = state.selection;
  if (selection.kind === 'mismatch') {
    selection = milliseconds >= selection.remainingMs ? { kind: 'closed' } : {
      ...selection, remainingMs: selection.remainingMs - milliseconds,
    };
  }
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  return elapsedMs === state.elapsedMs && selection === state.selection ? state : { ...state, selection, elapsedMs };
}
