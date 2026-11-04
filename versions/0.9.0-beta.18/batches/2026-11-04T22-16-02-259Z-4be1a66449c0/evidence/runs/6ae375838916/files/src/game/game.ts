import { parseBoard } from './deck.ts';
import type { Board } from './deck.ts';
export const MISMATCH_MS = 800, MAX_MOVES = 999999, MAX_TIME = 359999999;
export type Selection = { kind: 'closed' } | { kind: 'one'; index: number } | { kind: 'mismatch'; first: number; second: number; remainingMs: number };
export type Game = Readonly<{ board: Board; matched: readonly number[]; selection: Selection; moves: number; elapsedMs: number; started: boolean }>;
export function createGame(code: string): Game | null {
  const board = parseBoard(code);
  return board ? { board, matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false } : null;
}
export function isWon(game: Game): boolean { return game.matched.length === game.board.deck.length; }
export function activateCard(game: Game, index: number): Game {
  if (!Number.isInteger(index) || index < 0 || index >= game.board.deck.length || game.matched.includes(index) || isWon(game)) return game;
  const s = game.selection;
  switch (s.kind) {
    case 'closed': return { ...game, started: true, selection: { kind: 'one', index } };
    case 'one': {
      if (s.index === index) return game;
      const moves = Math.min(MAX_MOVES, game.moves + 1);
      if (game.board.deck[s.index] === game.board.deck[index]) return { ...game, moves, matched: [...game.matched, s.index, index], selection: { kind: 'closed' } };
      return { ...game, moves, selection: { kind: 'mismatch', first: s.index, second: index, remainingMs: MISMATCH_MS } };
    }
    case 'mismatch': return game;
  }
}
export function advanceGame(game: Game, milliseconds: number): Game {
  if (!game.started || isWon(game) || milliseconds <= 0) return game;
  const elapsedMs = Math.min(MAX_TIME, game.elapsedMs + milliseconds);
  const s = game.selection;
  if (s.kind !== 'mismatch') return { ...game, elapsedMs };
  return { ...game, elapsedMs, selection: milliseconds >= s.remainingMs ? { kind: 'closed' } : { ...s, remainingMs: s.remainingMs - milliseconds } };
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
