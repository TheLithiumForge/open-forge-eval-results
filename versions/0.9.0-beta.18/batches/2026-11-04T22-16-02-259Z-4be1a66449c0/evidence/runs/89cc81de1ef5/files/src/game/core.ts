import { MISMATCH_MS, MOVE_CAP, TIME_CAP } from './constants.ts';
import { createDeck, parseBoardCode, type BoardDescription } from './board/deal.ts';

export type Selection =
  | { readonly kind: 'closed' }
  | { readonly kind: 'one'; readonly index: number }
  | { readonly kind: 'mismatch'; readonly first: number; readonly second: number; readonly remainingMs: number };

export interface GameState extends BoardDescription {
  readonly deck: readonly number[];
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

const CLOSED: Selection = Object.freeze({ kind: 'closed' });

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  if (board === null) return null;
  return {
    ...board,
    deck: createDeck(board.size, board.seed),
    matched: [],
    selection: CLOSED,
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
}

export function matchedPairs(state: GameState): number {
  return state.matched.length / 2;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}

export function isRevealed(state: GameState, index: number): boolean {
  return state.matched.includes(index)
    || (state.selection.kind === 'one' && state.selection.index === index)
    || (state.selection.kind === 'mismatch'
      && (state.selection.first === index || state.selection.second === index));
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length || isWon(state)) return state;
  if (state.matched.includes(index) || state.selection.kind === 'mismatch') return state;
  if (state.selection.kind === 'closed') {
    return { ...state, selection: { kind: 'one', index }, started: true };
  }
  if (state.selection.index === index) return state;
  const first = state.selection.index;
  const second = index;
  const moves = Math.min(MOVE_CAP, state.moves + 1);
  const started = true;
  if (state.deck[first] === state.deck[second]) {
    return { ...state, matched: [...state.matched, first, second], selection: CLOSED, moves, started };
  }
  return {
    ...state,
    selection: { kind: 'mismatch', first, second, remainingMs: MISMATCH_MS },
    moves,
    started,
  };
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(TIME_CAP, state.elapsedMs + milliseconds);
  if (state.selection.kind !== 'mismatch') return { ...state, elapsedMs };
  if (milliseconds < state.selection.remainingMs) {
    return { ...state, elapsedMs, selection: { ...state.selection, remainingMs: state.selection.remainingMs - milliseconds } };
  }
  return { ...state, elapsedMs, selection: CLOSED };
}
