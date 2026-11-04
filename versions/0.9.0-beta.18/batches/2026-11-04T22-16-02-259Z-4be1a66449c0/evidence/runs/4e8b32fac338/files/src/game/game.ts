import { parseBoard } from './deck';
import type { Board } from './deck';
export const MISMATCH_MS = 800, MAX_MOVES = 999999, MAX_ELAPSED = 359999999;
export const selectionKinds = ['closed', 'one', 'mismatch'] as const;
export type Selection = { kind: typeof selectionKinds[0] } | { kind: typeof selectionKinds[1]; index: number } | { kind: typeof selectionKinds[2]; first: number; second: number; remainingMs: number };
export type Game = { readonly board: Board; readonly matched: readonly number[]; readonly selection: Selection; readonly moves: number; readonly elapsedMs: number; readonly started: boolean };
export function createGame(code: string): Game | null {
  const board = parseBoard(code);
  return board ? { board, matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false } : null;
}
export function isWon(game: Game): boolean { return game.matched.length === game.board.deck.length; }
export function activateCard(game: Game, index: number): Game {
  if (!Number.isInteger(index) || index < 0 || index >= game.board.deck.length || isWon(game) || game.matched.includes(index)) return game;
  switch (game.selection.kind) {
    case 'closed': return { ...game, started: true, selection: { kind: 'one', index } };
    case 'mismatch': return game;
    case 'one': {
      const first = game.selection.index;
      if (first === index) return game;
      const moves = Math.min(MAX_MOVES, game.moves + 1);
      if (game.board.deck[first] === game.board.deck[index]) return { ...game, moves, matched: [...game.matched, first, index], selection: { kind: 'closed' } };
      return { ...game, moves, selection: { kind: 'mismatch', first, second: index, remainingMs: MISMATCH_MS } };
    }
  }
}
export function advanceGame(game: Game, milliseconds: number): Game {
  if (!game.started || isWon(game) || milliseconds <= 0 || !Number.isFinite(milliseconds)) return game;
  const elapsedMs = Math.min(MAX_ELAPSED, game.elapsedMs + milliseconds);
  const selection = game.selection.kind === 'mismatch' ? (milliseconds >= game.selection.remainingMs ? { kind: 'closed' as const } : { ...game.selection, remainingMs: game.selection.remainingMs - milliseconds }) : game.selection;
  return { ...game, elapsedMs, selection };
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
