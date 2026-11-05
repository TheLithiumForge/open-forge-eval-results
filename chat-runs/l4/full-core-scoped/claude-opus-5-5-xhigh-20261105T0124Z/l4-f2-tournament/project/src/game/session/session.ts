import { activateCard, advanceGame, createGame, isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { rememberBest } from './storage.ts';
import type { GameState } from '../game.ts';
import type { Preferences } from './storage.ts';

// The part of a session that plays one game. Tournament turns use it without saved preferences.
export interface Play {
  readonly game: GameState;
  readonly paused: boolean;
  readonly generation: number;
  readonly feedback: string;
  readonly announcement: number;
  readonly celebration: boolean;
}

export interface Session extends Play {
  readonly loadNotice: string;
  readonly preferences: Preferences;
}

export const SessionNotice = {
  loaded: 'Loaded snapshot. Select Resume to continue.',
  loadedCompleted: 'Loaded completed snapshot.',
  invalidBoard: 'Invalid board code.',
  invalidSnapshot: 'Invalid snapshot.',
} as const;

export function initialSession(code: string, preferences: Preferences): Session {
  return {
    game: createGame(code),
    paused: false,
    generation: 0,
    feedback: '',
    loadNotice: '',
    announcement: 0,
    celebration: false,
    preferences,
  };
}

export function replaceGame(session: Session, game: GameState, imported: boolean): Session {
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
    preferences: { ...session.preferences, size: game.size },
    // Only loads have a published status. A new deal clears the last turn result silently.
    announcement: imported ? session.announcement + 1 : session.announcement,
    feedback: loadNotice,
    loadNotice,
  };
}

export function tickSession<P extends Play>(
  session: P,
  generation: number,
  milliseconds: number,
): P {
  if (session.generation !== generation || session.paused) return session;
  const game = advanceGame(session.game, milliseconds);
  return game === session.game ? session : { ...session, game };
}

export function activatePlay<P extends Play>(play: P, index: number): P {
  if (play.paused) return play;
  const game = activateCard(play.game, index);
  if (game === play.game) return play;
  if (game.selection.kind === SelectionKind.one) return { ...play, game };
  const won = isWon(game);
  const feedback = won
    ? `Pair found. All pairs found in ${game.moves} moves and ${formatElapsed(game.elapsedMs)}.`
    : game.selection.kind === SelectionKind.mismatch
      ? 'No match. Cards close after a short pause.'
      : `Pair found. ${game.matched.length / 2} ${game.matched.length === 2 ? 'pair' : 'pairs'} matched.`;
  return { ...play, game, feedback, announcement: play.announcement + 1, celebration: won };
}

// Only a solo game that play completes can set a new best.
export function activateSession(session: Session, index: number): Session {
  const next = activatePlay(session, index);
  if (next === session || !next.celebration) return next;
  return {
    ...next,
    preferences: rememberBest(session.preferences, next.game.size, next.game.moves),
  };
}
