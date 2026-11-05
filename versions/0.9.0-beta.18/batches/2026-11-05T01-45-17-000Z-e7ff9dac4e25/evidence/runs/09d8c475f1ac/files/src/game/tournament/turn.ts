import { boardCode } from '../deck.ts';
import { isWon } from '../game.ts';
import { initialSession } from '../session/session.ts';
import { DEFAULT_SIZE } from '../session/storage.ts';
import type { GameState } from '../game.ts';
import type { Session } from '../session/session.ts';
import { champion, nextTurn } from './rules.ts';
import type { Result, Tournament, Turn } from './rules.ts';

// A turn's session carries preferences of its own. They are never read from or written to the
// browser store, so tournament games cannot change the saved size or the best moves.
const DETACHED = { size: DEFAULT_SIZE, bestMoves: {} };

// The session behind the page while no turn is on screen. It never starts, so no clock runs.
export const IDLE: Session = initialSession(boardCode(DEFAULT_SIZE, 1), DETACHED);

// Each turn gets its own generation, so a timer from an earlier turn cannot act on this one.
export function turnSession(code: string, generation: number): Session {
  return { ...initialSession(code, DETACHED), generation };
}

// Active time is kept in whole milliseconds, the same way a snapshot keeps it.
export function resultOf(game: GameState): Result {
  return { moves: game.moves, elapsedMs: Math.floor(game.elapsedMs) };
}

export type View =
  | { readonly kind: 'setup' }
  | { readonly kind: 'ready'; readonly turn: Turn }
  | { readonly kind: 'playing' | 'turnDone' | 'matchDone'; readonly turn: Turn }
  | { readonly kind: 'finished'; readonly champion: number };

// What the screen shows, from the tournament, the turn on screen and that turn's game.
export function viewOf(tournament: Tournament | null, turn: Turn | null, game: GameState): View {
  if (!tournament) return { kind: 'setup' };
  const winner = champion(tournament);
  if (winner !== null) return { kind: 'finished', champion: winner };
  if (turn) {
    if (!isWon(game)) return { kind: 'playing', turn };
    return { kind: turn.slot === 1 ? 'matchDone' : 'turnDone', turn };
  }
  const next = nextTurn(tournament);
  return next ? { kind: 'ready', turn: next } : { kind: 'setup' };
}
