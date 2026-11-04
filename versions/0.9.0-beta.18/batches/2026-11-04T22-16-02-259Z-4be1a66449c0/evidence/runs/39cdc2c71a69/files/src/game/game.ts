import { makeDeck, parseBoardCode } from './deck.ts';
import type { Size } from './deck.ts';
export const MISMATCH_MS = 800, MAX_MOVES = 999999, MAX_TIME = 359999999;
export type Selection = { kind: 'closed' } | { kind: 'one'; index: number } | { kind: 'mismatch'; first: number; second: number; remainingMs: number };
export type Game = { readonly boardCode: string; readonly size: Size; readonly deck: readonly number[]; readonly matched: readonly number[]; readonly selection: Selection; readonly moves: number; readonly elapsedMs: number; readonly started: boolean };
export function createGame(boardCode: string): Game {
  const board = parseBoardCode(boardCode);
  if (!board) throw new Error('Invalid board code');
  return { boardCode, size: board.size, deck: makeDeck(board.size, board.seed), matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
}
export function isWon(game: Game): boolean { return game.matched.length === game.deck.length; }
export function activateCard(game: Game, index: number): Game {
  if (!Number.isInteger(index) || index < 0 || index >= game.deck.length || game.matched.includes(index) || isWon(game)) return game;
  const selection = game.selection;
  switch (selection.kind) {
    case 'closed': return { ...game, started: true, selection: { kind: 'one', index } };
    case 'one': {
      if (selection.index === index) return game;
      const moves = Math.min(MAX_MOVES, game.moves + 1);
      if (game.deck[index] === game.deck[selection.index]) return { ...game, moves, matched: [...game.matched, selection.index, index], selection: { kind: 'closed' } };
      return { ...game, moves, selection: { kind: 'mismatch', first: selection.index, second: index, remainingMs: MISMATCH_MS } };
    }
    case 'mismatch': return game;
  }
}
export function advanceGame(game: Game, milliseconds: number): Game {
  if (!game.started || isWon(game) || milliseconds <= 0) return game;
  const selection = game.selection.kind === 'mismatch'
    ? milliseconds >= game.selection.remainingMs ? { kind: 'closed' } as const : { ...game.selection, remainingMs: game.selection.remainingMs - milliseconds }
    : game.selection;
  return { ...game, elapsedMs: Math.min(MAX_TIME, game.elapsedMs + milliseconds), selection };
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
