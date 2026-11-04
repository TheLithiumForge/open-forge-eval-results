import { generateDeck, parseBoardCode } from './deck.ts';
import type { Board } from './deck.ts';

export const SELECTION_KINDS = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | Readonly<{ kind: typeof SELECTION_KINDS.closed }>
  | Readonly<{ kind: typeof SELECTION_KINDS.one; index: number }>
  | Readonly<{ kind: typeof SELECTION_KINDS.mismatch; first: number; second: number; remainingMs: number }>;
export const MISMATCH_MS = 800;
export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;

export type GameState = Readonly<{
  board: Board;
  deck: readonly number[];
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  if (!board) return null;
  return {
    board, deck: generateDeck(board), matched: [], selection: { kind: 'closed' },
    moves: 0, elapsedMs: 0, started: false,
  };
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length || state.matched.includes(index)) return state;
  switch (state.selection.kind) {
    case 'mismatch': return state;
    case 'closed': return { ...state, started: true, selection: { kind: 'one', index } };
    case 'one': {
      const first = state.selection.index;
      if (first === index) return state;
      const moves = Math.min(MAX_MOVES, state.moves + 1);
      if (state.deck[first] === state.deck[index]) {
        return { ...state, moves, matched: [...state.matched, first, index], selection: { kind: 'closed' } };
      }
      return { ...state, moves, selection: { kind: 'mismatch', first, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(MAX_ELAPSED_MS, state.elapsedMs + milliseconds);
  let selection = state.selection;
  switch (selection.kind) {
    case 'closed': break;
    case 'one': break;
    case 'mismatch':
      selection = milliseconds >= selection.remainingMs
        ? { kind: 'closed' }
        : { ...selection, remainingMs: selection.remainingMs - milliseconds };
      break;
  }
  if (elapsedMs === state.elapsedMs && selection === state.selection) return state;
  return { ...state, elapsedMs, selection };
}
