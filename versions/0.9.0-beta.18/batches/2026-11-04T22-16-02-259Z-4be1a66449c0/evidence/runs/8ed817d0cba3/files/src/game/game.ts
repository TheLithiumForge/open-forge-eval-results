import { parseBoard } from './deck.ts';
import type { Board } from './deck.ts';
export const MAX_MOVES = 999999, MAX_TIME = 359999999, MISMATCH_MS = 800;
export const SELECTION = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection = { kind: typeof SELECTION.closed } | { kind: typeof SELECTION.one; index: number } | { kind: typeof SELECTION.mismatch; first: number; second: number; remainingMs: number };
export type Game = { board: Board; matched: readonly number[]; selection: Selection; moves: number; elapsedMs: number; started: boolean };
export function createGame(code: string): Game | null {
  const board = parseBoard(code);
  return board ? { board, matched: [], selection: { kind: SELECTION.closed }, moves: 0, elapsedMs: 0, started: false } : null;
}
export function isWon(game: Game): boolean { return game.matched.length === game.board.deck.length; }
export function activateCard(game: Game, index: number): Game {
  if (!Number.isInteger(index) || index < 0 || index >= game.board.deck.length || game.matched.includes(index) || isWon(game)) return game;
  switch (game.selection.kind) {
    case SELECTION.closed: return { ...game, started: true, selection: { kind: SELECTION.one, index } };
    case SELECTION.one: {
      const first = game.selection.index;
      if (first === index) return game;
      const moves = Math.min(MAX_MOVES, game.moves + 1);
      if (game.board.deck[first] === game.board.deck[index]) return { ...game, moves, matched: [...game.matched, first, index], selection: { kind: SELECTION.closed } };
      return { ...game, moves, selection: { kind: SELECTION.mismatch, first, second: index, remainingMs: MISMATCH_MS } };
    }
    case SELECTION.mismatch: return game;
  }
}
export function advanceGame(game: Game, milliseconds: number): Game {
  if (!game.started || isWon(game) || milliseconds <= 0) return game;
  const elapsedMs = Math.min(MAX_TIME, game.elapsedMs + milliseconds);
  const selection = game.selection.kind === SELECTION.mismatch
    ? milliseconds >= game.selection.remainingMs ? { kind: SELECTION.closed } : { ...game.selection, remainingMs: game.selection.remainingMs - milliseconds }
    : game.selection;
  return { ...game, elapsedMs, selection };
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
