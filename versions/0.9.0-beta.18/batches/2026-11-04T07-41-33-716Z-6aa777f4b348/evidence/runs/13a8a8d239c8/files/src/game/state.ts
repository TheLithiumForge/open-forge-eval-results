import { parseBoardCode, type Board } from './board.ts';

export const MISMATCH_MS = 800;
export const MAX_MOVES = 999_999;
export const MAX_ELAPSED_MS = 359_999_999;
export const SELECTION_KIND = Object.freeze({ closed: 'closed', one: 'one', mismatch: 'mismatch' } as const);

export interface ClosedSelection {
  readonly kind: typeof SELECTION_KIND.closed;
}
export interface OneSelection {
  readonly kind: typeof SELECTION_KIND.one;
  readonly index: number;
}
export interface MismatchSelection {
  readonly kind: typeof SELECTION_KIND.mismatch;
  readonly first: number;
  readonly second: number;
  readonly remainingMs: number;
}
export type Selection = ClosedSelection | OneSelection | MismatchSelection;

export interface GameState {
  readonly board: Board;
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

const CLOSED: ClosedSelection = Object.freeze({ kind: SELECTION_KIND.closed });

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  return board === null ? null : initialGame(board);
}

export function initialGame(board: Board): GameState {
  return { board, matched: Object.freeze([]), selection: CLOSED, moves: 0, elapsedMs: 0, started: false };
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length) return state;
  if (state.selection.kind === SELECTION_KIND.mismatch || state.matched.includes(index)) return state;

  if (state.selection.kind === SELECTION_KIND.closed) {
    return { ...state, selection: { kind: SELECTION_KIND.one, index }, started: true };
  }
  if (state.selection.index === index) return state;

  const moves = Math.min(MAX_MOVES, state.moves + 1);
  const firstFace = state.board.deck[state.selection.index];
  const secondFace = state.board.deck[index];
  if (firstFace === undefined || secondFace === undefined) return state;
  if (firstFace !== secondFace) {
    return {
      ...state,
      moves,
      selection: { kind: SELECTION_KIND.mismatch, first: state.selection.index, second: index, remainingMs: MISMATCH_MS },
    };
  }

  return {
    ...state,
    moves,
    matched: Object.freeze([...state.matched, state.selection.index, index]),
    selection: CLOSED,
  };
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || !state.started || isWon(state)) return state;
  if (state.selection.kind !== SELECTION_KIND.mismatch) {
    return milliseconds === 0 ? state : { ...state, elapsedMs: addElapsed(state.elapsedMs, milliseconds) };
  }

  const used = Math.min(milliseconds, state.selection.remainingMs);
  const elapsedMs = addElapsed(state.elapsedMs, used);
  const remaining = state.selection.remainingMs - used;
  if (remaining > 0) {
    return { ...state, elapsedMs, selection: { ...state.selection, remainingMs: remaining } };
  }

  const afterClose = { ...state, elapsedMs, selection: CLOSED };
  const extra = milliseconds - used;
  return extra === 0 ? afterClose : { ...afterClose, elapsedMs: addElapsed(elapsedMs, extra) };
}

function addElapsed(current: number, amount: number): number {
  return amount >= MAX_ELAPSED_MS - current ? MAX_ELAPSED_MS : current + amount;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function matchedPairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function totalPairCount(state: GameState): number {
  return state.board.deck.length / 2;
}

export function formatElapsedTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
