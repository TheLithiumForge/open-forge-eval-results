import { parseBoardCode } from './boardCode.ts';
import type { BoardDescription } from './boardCode.ts';
import { generateDeck } from './deck.ts';
import { SELECTION } from './selection.ts';
import type { Selection } from './selection.ts';

export const MAX_MOVES = 999999;
export const MAX_ELAPSED_MS = 359999999;

export interface Board extends BoardDescription {
  readonly deck: readonly number[];
}

export interface GameState {
  readonly board: Board;
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export function createGame(boardCode: string): GameState {
  const description = parseBoardCode(boardCode);
  if (!description) throw new Error('Invalid board code.');
  const board = Object.freeze({ ...description, deck: generateDeck(description) });
  return {
    board, matched: [], selection: { kind: SELECTION.closed },
    moves: 0, elapsedMs: 0, started: false,
  };
}

export function pairCount(state: GameState): number {
  return state.matched.length / 2;
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length;
}

export function formatTime(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
