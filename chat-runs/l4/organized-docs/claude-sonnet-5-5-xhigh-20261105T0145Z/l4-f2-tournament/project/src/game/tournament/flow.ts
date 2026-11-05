import { createGame, isWon } from '../game.ts';
import { initialSession, replaceGame } from '../session/session.ts';
import { readPreferences } from '../session/storage.ts';
import {
  hasStarted,
  isFinished,
  isPlayerCount,
  nameOf,
  nextTurn,
  recordResult,
  seedsOf,
  winnerOf,
} from './rules.ts';
import type { GameState } from '../game.ts';
import type { Session } from '../session/session.ts';
import type { PlayerCount, Result, Tournament, Turn } from './rules.ts';

export const TurnPhase = { idle: 'idle', playing: 'playing', done: 'done' } as const;
type TurnPhaseName = (typeof TurnPhase)[keyof typeof TurnPhase];
export const Screen = { setup: 'setup', play: 'play', finished: 'finished' } as const;
type ScreenName = (typeof Screen)[keyof typeof Screen];

const MAX_DRAFTS = 8;

export interface State {
  // Tournament games run in their own session, whose preferences are never read from or written
  // to storage, so a tournament cannot change the saved size or a best score.
  readonly session: Session;
  readonly tournament: Tournament | null;
  readonly count: PlayerCount;
  readonly drafts: readonly string[];
  readonly phase: TurnPhaseName;
  readonly active: Turn | null;
}

export function initialState(code: string): State {
  return {
    session: initialSession(code, readPreferences(null)),
    tournament: null,
    count: 4,
    drafts: Array.from({ length: MAX_DRAFTS }, () => ''),
    phase: TurnPhase.idle,
    active: null,
  };
}

export function announce(session: Session, feedback: string): Session {
  return { ...session, feedback, announcement: session.announcement + 1 };
}

// A fresh unstarted game on the same deal invalidates the pending timer updates of the last one.
export function resetSession(session: Session): Session {
  return replaceGame(session, createGame(session.game.boardCode), false);
}

export function screenOf(state: State): ScreenName {
  if (!state.tournament) return Screen.setup;
  return isFinished(state.tournament) ? Screen.finished : Screen.play;
}

// The turn the screen is about: the next one while waiting, or the one being played or just done.
export function shownTurn(state: State): Turn | null {
  if (!state.tournament || isFinished(state.tournament)) return null;
  return state.phase === TurnPhase.idle ? nextTurn(state.tournament) : state.active;
}

export function playerOf(tournament: Tournament, turn: Turn): string {
  const seed = seedsOf(tournament, turn.match)?.[turn.seat];
  return seed === undefined ? '' : (tournament.players[seed - 1] ?? '');
}

function resultOf(game: GameState): Result | null {
  return isWon(game) ? { moves: game.moves, elapsedMs: Math.floor(game.elapsedMs) } : null;
}

// Records the game that just ended, with the verdict when it ended a match.
export function finishTurn(state: State, session: Session): State | null {
  const { tournament, active } = state;
  const result = resultOf(session.game);
  if (!tournament || !active || !result) return null;
  const recorded = recordResult(tournament, result);
  const lastMatch = active.match === recorded.matches.length - 1;
  const winner = nameOf(recorded, winnerOf(recorded, active.match));
  const verdict =
    active.seat === 1 ? ` ${winner} wins the ${lastMatch ? 'tournament' : 'match'}.` : '';
  return {
    ...state,
    tournament: recorded,
    phase: TurnPhase.done,
    session: { ...session, feedback: `${session.feedback}${verdict}` },
  };
}

// A loaded tournament that has matches continues from its recorded results. One without matches is
// a draft that fills the setup. It is never added to the saved list.
export function loadedState(base: State, tournament: Tournament): State | null {
  const count = tournament.players.length;
  if (!isPlayerCount(count)) return null;
  if (hasStarted(tournament)) return { ...base, tournament, count };
  return { ...base, count, drafts: [...tournament.players, ...base.drafts.slice(count)] };
}
