import { isFinished, recordTurn, turnAt, turnsPlayed } from './tournament.ts';
import type { Tournament, TurnInfo, TurnResult } from './tournament.ts';

export const TurnPhase = { ready: 'ready', playing: 'playing', done: 'done' } as const;
type TurnPhaseKind = (typeof TurnPhase)[keyof typeof TurnPhase];

export const NextStep = { turn: 'turn', match: 'match', none: 'none' } as const;
type NextStepKind = (typeof NextStep)[keyof typeof NextStep];

// Without a tournament the screen shows the setup. With one, the phase says whether the next
// player has yet to start, is playing, or has just finished a game.
export interface TournamentSession {
  readonly tournament: Tournament | null;
  readonly phase: TurnPhaseKind;
  readonly notice: string;
}

export function idleSession(notice = ''): TournamentSession {
  return { tournament: null, phase: TurnPhase.ready, notice };
}

// A finished tournament opens on its result. An unfinished one waits for its next player.
export function openSession(tournament: Tournament, notice = ''): TournamentSession {
  return { tournament, phase: isFinished(tournament) ? TurnPhase.done : TurnPhase.ready, notice };
}

export function startTurn(session: TournamentSession): TournamentSession {
  const { tournament } = session;
  if (!tournament || session.phase !== TurnPhase.ready || isFinished(tournament)) return session;
  return { ...session, phase: TurnPhase.playing, notice: '' };
}

export function finishTurn(session: TournamentSession, result: TurnResult): TournamentSession {
  const { tournament } = session;
  if (!tournament || session.phase !== TurnPhase.playing) return session;
  return { ...session, tournament: recordTurn(tournament, result), phase: TurnPhase.done };
}

export function nextTurn(session: TournamentSession): TournamentSession {
  const { tournament } = session;
  if (!tournament || session.phase !== TurnPhase.done || isFinished(tournament)) return session;
  return { ...session, phase: TurnPhase.ready };
}

// The game on screen is the one being played or just finished. Between games it is the next one.
export function shownTurnNumber(tournament: Tournament, phase: TurnPhaseKind): number {
  return phase === TurnPhase.done ? turnsPlayed(tournament) - 1 : turnsPlayed(tournament);
}

export function shownTurn(session: TournamentSession): TurnInfo | null {
  const { tournament } = session;
  return tournament ? turnAt(tournament, shownTurnNumber(tournament, session.phase)) : null;
}

// After a game, the same match goes on with its second player, or the next match begins.
export function nextStep(session: TournamentSession): NextStepKind {
  const { tournament } = session;
  if (!tournament || session.phase !== TurnPhase.done || isFinished(tournament))
    return NextStep.none;
  return turnsPlayed(tournament) % 2 === 0 ? NextStep.match : NextStep.turn;
}
