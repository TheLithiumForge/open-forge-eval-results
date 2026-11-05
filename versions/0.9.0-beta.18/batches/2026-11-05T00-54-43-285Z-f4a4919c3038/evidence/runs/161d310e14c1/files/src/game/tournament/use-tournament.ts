import { useRef, useState } from 'react';
import { createGame, isWon } from '../game.ts';
import { activateSession, initialSession } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { TournamentPhase } from './model.ts';
import { currentPlayerName, matchWinner, currentMatchIndex, tournamentRound } from './pairing.ts';
import {
  tournamentSetup,
  startTournament,
  startTournamentTurn,
  finishTournamentTurn,
  nextTournamentTurn,
} from './rules.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import { playerNamesError } from './names.ts';
import { useTournamentHistory } from './use-history.ts';
import type { Session } from '../session/session.ts';
import type { TournamentState } from './model.ts';

export function useTournament(publish: (text: string) => void) {
  const [state, setState] = useState(tournamentSetup);
  const current = useRef(state);
  const [session, setSession] = useState(() => ({
    ...initialSession('np1-4-1', { size: 4, bestMoves: {} }),
    paused: true,
  }));
  const currentSession = useRef<Session>(session);
  const [loadNotice, setLoadNotice] = useState('');
  const history = useTournamentHistory();

  function commit(next: TournamentState): void {
    current.current = next;
    setState(next);
  }

  function commitSession(next: Session): void {
    const previous = currentSession.current;
    if (next === previous) return;
    currentSession.current = next;
    setSession(next);
    if (current.current.phase !== TournamentPhase.playing) return;
    const nextState = isWon(next.game)
      ? finishTournamentTurn(current.current, next.game)
      : { ...current.current, game: next.game };
    commit(nextState);
    if (next.announcement !== previous.announcement) {
      const winner = matchWinner(nextState, currentMatchIndex(nextState));
      const outcome = winner
        ? `${nextState.phase === TournamentPhase.complete ? 'Champion' : 'Match winner'}: ${nextState.names[winner - 1]}.`
        : '';
      publish([next.feedback, outcome].filter(Boolean).join(' '));
    }
    if (nextState.phase === TournamentPhase.complete) history.save(nextState);
  }

  const clock = useSessionClock(
    session,
    currentSession,
    commitSession,
    state.phase !== TournamentPhase.setup && state.phase !== TournamentPhase.complete,
  );

  function install(next: TournamentState): void {
    clock.reset();
    commit(next);
    const previous = currentSession.current;
    const nextSession = {
      ...previous,
      game: next.game ?? createGame('np1-4-1'),
      generation: previous.generation + 1,
      paused: next.phase !== TournamentPhase.playing,
      feedback: '',
      celebration: false,
    };
    currentSession.current = nextSession;
    setSession(nextSession);
  }

  function start(): string | null {
    const error = playerNamesError(current.current.names);
    if (error) {
      publish(error);
      return error;
    }
    const codes: string[] = [];
    for (let index = 0; index < current.current.names.length - 1; index += 1) {
      const size = tournamentRound(current.current.names.length, index).size;
      let code = freshBoardCode(size);
      while (codes.includes(code)) code = freshBoardCode(size);
      codes.push(code);
    }
    const next = startTournament(current.current.names, codes);
    if (next) {
      install(next);
      publish(`Now playing: ${currentPlayerName(next)}`);
    }
    return null;
  }

  function advance(): void {
    const next = nextTournamentTurn(current.current);
    if (next === current.current) return;
    install(next);
    publish(`Now playing: ${currentPlayerName(next)}`);
  }

  function startTurn(): void {
    const next = startTournamentTurn(current.current);
    if (next !== current.current) {
      install(next);
      publish(`Now playing: ${currentPlayerName(next)}`);
    }
  }

  function activate(index: number): void {
    if (current.current.phase !== TournamentPhase.playing) return;
    clock.synchronize();
    commitSession(activateSession(currentSession.current, index, false));
  }

  function load(text: string): { state: TournamentState } | { error: string } {
    const result = decodeTournament(text);
    if ('error' in result) return result;
    setLoadNotice('');
    return {
      state:
        result.state.phase === TournamentPhase.playing
          ? { ...result.state, phase: TournamentPhase.ready }
          : result.state,
    };
  }

  function accept(next: TournamentState): void {
    install(next);
    if (next.phase === TournamentPhase.complete) history.save(next);
    setLoadNotice('Loaded tournament.');
    publish(
      next.phase === TournamentPhase.ready
        ? `Loaded tournament. Now playing: ${currentPlayerName(next)}. Select Start turn to continue.`
        : 'Loaded tournament.',
    );
  }

  function view(next: TournamentState): void {
    install(next);
    setLoadNotice('');
    publish('Showing past tournament.');
  }

  function exportJSON(): string {
    clock.synchronize();
    return encodeTournament(current.current);
  }

  function edit(names: readonly string[]): void {
    if (current.current.phase === TournamentPhase.setup) commit(tournamentSetup(names));
  }

  return {
    state,
    session,
    history,
    loadNotice,
    start,
    advance,
    startTurn,
    activate,
    load,
    accept,
    view,
    exportJSON,
    edit,
    reset: () => install(tournamentSetup()),
  };
}
