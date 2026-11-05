import { activateCard, advanceGame, createGame, isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { rememberBest } from './storage.ts';
import type { GameState } from '../game.ts';
import type { Preferences } from './storage.ts';

// One game on screen with its turn feedback. Tournament turns use it without saved preferences.
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

export function startPlay(code: string): Play {
  return {
    game: createGame(code),
    paused: false,
    generation: 0,
    feedback: '',
    announcement: 0,
    celebration: false,
  };
}

export function initialSession(code: string, preferences: Preferences): Session {
  return { ...startPlay(code), loadNotice: '', preferences };
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

export function tickSession<S extends Play>(
  session: S,
  generation: number,
  milliseconds: number,
): S {
  if (session.generation !== generation || session.paused) return session;
  const game = advanceGame(session.game, milliseconds);
  return game === session.game ? session : { ...session, game };
}

// Resolves a turn and its feedback. Only the solo session records a best, in activateSession.
export function playTurn<S extends Play>(session: S, index: number): S {
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
  return { ...session, game, feedback, announcement: session.announcement + 1, celebration: won };
}

export function activateSession(session: Session, index: number): Session {
  const next = playTurn(session, index);
  if (next === session || !isWon(next.game)) return next;
  return {
    ...next,
    preferences: rememberBest(session.preferences, next.game.size, next.game.moves),
  };
}
