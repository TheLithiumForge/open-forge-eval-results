import { useRef, useState } from 'react';
import { createGame, isWon } from '../game.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { activateSession, replaceGame } from '../session/session.ts';
import { DEFAULT_SIZE } from '../session/storage.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import { dealCodes } from './deals.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import {
  announce,
  finishTurn,
  initialState,
  loadedState,
  playerOf,
  resetSession,
  screenOf,
  shownTurn,
  TurnPhase,
} from './flow.ts';
import { checkNames, normalizeName } from './names.ts';
import { createTournament, isFinished, isPlayerCount, nextTurn, roundOf } from './rules.ts';
import type { State } from './flow.ts';
import type { Session } from '../session/session.ts';
import type { RecordTournament } from './use-saved-tournaments.ts';

export function useTournament(record: RecordTournament) {
  const [state, setState] = useState(() => initialState(freshBoardCode(DEFAULT_SIZE)));
  const current = useRef(state);
  const sessionRef = useRef(state.session);

  function commit(next: State): void {
    if (next === current.current) return;
    current.current = next;
    sessionRef.current = next.session;
    setState(next);
  }

  const clock = useSessionClock(state.session, sessionRef, (session: Session) =>
    commit({ ...current.current, session }),
  );

  function notice(text: string): void {
    commit({ ...current.current, session: announce(current.current.session, text) });
  }

  // Leaving a screen drops its tournament and game, and the text the game published.
  function cleared(): State {
    clock.reset();
    return {
      ...current.current,
      tournament: null,
      phase: TurnPhase.idle,
      active: null,
      session: resetSession(current.current.session),
    };
  }

  function setCount(count: number): void {
    if (isPlayerCount(count)) commit({ ...current.current, count });
  }

  function setName(index: number, draft: string): void {
    const drafts = current.current.drafts.map((entry, at) => (at === index ? draft : entry));
    commit({ ...current.current, drafts });
  }

  function start(): boolean {
    const { count, drafts } = current.current;
    const check = checkNames(drafts.slice(0, count));
    if (!check.ok) {
      notice(check.notice);
      return false;
    }
    const tournament = createTournament(check.names, dealCodes(count));
    commit({ ...cleared(), tournament, drafts: [...check.names, ...drafts.slice(count)] });
    return true;
  }

  function startTurn(): void {
    const { tournament, phase, session } = current.current;
    const turn = tournament && nextTurn(tournament);
    const match = tournament?.matches[turn?.match ?? -1];
    if (!turn || !match || phase !== TurnPhase.idle) return;
    clock.reset();
    commit({
      ...current.current,
      phase: TurnPhase.playing,
      active: turn,
      session: replaceGame(session, createGame(match.boardCode), false),
    });
  }

  function finish(state: State, session: Session): void {
    const next = finishTurn(state, session);
    if (!next?.tournament) return;
    if (isFinished(next.tournament)) record(next.tournament);
    commit(next);
  }

  function activate(index: number): void {
    clock.synchronize();
    const state = current.current;
    if (state.phase !== TurnPhase.playing) return;
    const session = activateSession(state.session, index);
    if (session === state.session) return;
    if (isWon(session.game)) finish(state, session);
    else commit({ ...state, session });
  }

  function nextPlayer(): void {
    const state = current.current;
    if (state.phase !== TurnPhase.done) return;
    const session = { ...state.session, feedback: '', celebration: false };
    commit({ ...state, phase: TurnPhase.idle, active: null, session });
  }

  function leave(): void {
    commit(cleared());
  }

  function exportTournament(): string {
    const { tournament, count, drafts } = current.current;
    const players = drafts.slice(0, count).map(normalizeName);
    return encodeTournament(tournament ?? { players, matches: [] });
  }

  function loadTournament(text: string): boolean {
    const decoded = decodeTournament(text);
    if (!decoded.ok) {
      notice(decoded.notice);
      return false;
    }
    const loaded = loadedState(cleared(), decoded.tournament);
    if (loaded) commit(loaded);
    return loaded !== null;
  }

  const turn = shownTurn(state);
  const { tournament } = state;
  const shown = tournament && turn ? { name: playerOf(tournament, turn), turn } : null;
  return {
    state,
    screen: screenOf(state),
    now: shown ? `Now playing: ${shown.name}` : '',
    round: tournament && shown ? roundOf(tournament.players.length, shown.turn.match) : null,
    setCount,
    setName,
    start,
    startTurn,
    activate,
    nextPlayer,
    leave,
    exportTournament,
    loadTournament,
  };
}

export type TournamentController = ReturnType<typeof useTournament>;
