import { activateCard, advanceGame, createGame, isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { rememberBest } from './storage.ts';
import type { GameState } from '../game.ts';
import type { Preferences } from './storage.ts';

// One game with its browser bookkeeping. Tournament turns play this alone, so they keep no records.
export interface PlaySession {
  readonly game: GameState;
  readonly paused: boolean;
  readonly generation: number;
  readonly feedback: string;
  readonly loadNotice: string;
  readonly announcement: number;
  readonly celebration: boolean;
}

// Solo play also remembers the chosen size and the best moves for each size.
export interface Session extends PlaySession {
  readonly preferences: Preferences;
}

export const SessionNotice = {
  loaded: 'Loaded snapshot. Select Resume to continue.',
  loadedCompleted: 'Loaded completed snapshot.',
  invalidBoard: 'Invalid board code.',
  invalidSnapshot: 'Invalid snapshot.',
} as const;

export function initialPlay(code: string): PlaySession {
  return {
    game: createGame(code),
    paused: false,
    generation: 0,
    feedback: '',
    loadNotice: '',
    announcement: 0,
    celebration: false,
  };
}

export function initialSession(code: string, preferences: Preferences): Session {
  return { ...initialPlay(code), preferences };
}

export function replacePlay<S extends PlaySession>(
  session: S,
  game: GameState,
  imported: boolean,
): S {
  const paused = imported && !isWon(game);
  const loadNotice = imported
    ? paused
      ? SessionNotice.loaded
      : SessionNotice.loadedCompleted
    : '';
  return {
    ...session,
    game,
    paused,
    generation: session.generation + 1,
    celebration: false,
    // Only loads have a published status. A new deal clears the last turn result silently.
    announcement: imported ? session.announcement + 1 : session.announcement,
    feedback: loadNotice,
    loadNotice,
  };
}

export function replaceGame(session: Session, game: GameState, imported: boolean): Session {
  const preferences = { ...session.preferences, size: game.size };
  return { ...replacePlay(session, game, imported), preferences };
}

export function tickSession<S extends PlaySession>(
  session: S,
  generation: number,
  milliseconds: number,
): S {
  if (session.generation !== generation || session.paused) return session;
  const game = advanceGame(session.game, milliseconds);
  return game === session.game ? session : { ...session, game };
}

export function activatePlay<S extends PlaySession>(session: S, index: number): S {
  if (session.paused) return session;
  const game = activateCard(session.game, index);
  if (game === session.game) return session;
  if (game.selection.kind === SelectionKind.one) return { ...session, game };
  const won = isWon(game);
  const feedback = won
    ? `Pair found. All pairs found in ${game.moves} moves and ${formatElapsed(game.elapsedMs)}.`
    : game.selection.kind === SelectionKind.mismatch
      ? 'No match. Cards close after a short pause.'
      : `Pair found. ${game.matched.length / 2} ${game.matched.length === 2 ? 'pair' : 'pairs'} matched.`;
  return {
    ...session,
    game,
    feedback,
    announcement: session.announcement + 1,
    celebration: won,
  };
}

// Completing a solo game through play is the one path that can record a best.
export function activateSession(session: Session, index: number): Session {
  const next = activatePlay(session, index);
  if (next.game === session.game || !isWon(next.game)) return next;
  const { size, moves } = next.game;
  return { ...next, preferences: rememberBest(session.preferences, size, moves) };
}
