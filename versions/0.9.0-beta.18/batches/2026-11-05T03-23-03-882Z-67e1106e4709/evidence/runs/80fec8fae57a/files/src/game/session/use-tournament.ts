import { useRef, useState } from 'react';
import { initialSession, activateSession } from './session.ts';
import { useSessionClock } from './use-session-clock.ts';
import { freshBoardCode } from './fresh-board.ts';
import {
  createTournament,
  nextTournamentTurn,
  roundFor,
  startTournamentTurn,
  updateTournamentGame,
} from '../tournament/rules.ts';
import { TournamentPhase } from '../tournament/model.ts';
import type { Session } from './session.ts';
import type { TournamentState } from '../tournament/model.ts';

export function useTournament() {
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const event = useRef(tournament);
  const [session, setSession] = useState(() => ({
    ...initialSession('np1-4-1', { size: 4, bestMoves: {} }),
    paused: true,
  }));
  const current = useRef<Session>(session);

  function commit(next: Session): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
    if (event.current && next.game !== event.current.game) {
      event.current = updateTournamentGame(event.current, next.game);
      setTournament(event.current);
    }
  }

  const clock = useSessionClock(session, current, commit);

  function install(
    state: TournamentState | null,
    feedback = state?.phase === TournamentPhase.complete ? 'Loaded completed tournament.' : '',
  ): void {
    clock.reset();
    event.current = state;
    setTournament(state);
    const previous = current.current;
    if (!state) {
      commit({
        ...previous,
        paused: true,
        feedback,
        generation: previous.generation + 1,
        announcement: previous.announcement + 1,
      });
      return;
    }
    commit({
      ...previous,
      game: state.game,
      paused: true,
      generation: previous.generation + 1,
      celebration: false,
      announcement: previous.announcement + 1,
      feedback,
    });
  }

  function start(names: readonly string[]): void {
    const codes: string[] = [];
    for (let index = 0; index < names.length - 1; index += 1) {
      const size = roundFor(names.length, index).size;
      let code: string;
      do {
        code = freshBoardCode(size);
      } while (codes.includes(code));
      codes.push(code);
    }
    install(createTournament(names, codes));
  }

  function startTurn(): void {
    const state = event.current;
    if (
      !state ||
      (state.phase !== TournamentPhase.ready && state.phase !== TournamentPhase.playing)
    )
      return;
    event.current = startTournamentTurn(state);
    setTournament(event.current);
    clock.reset();
    commit({ ...current.current, paused: false, feedback: '' });
  }

  function nextTurn(): void {
    if (event.current) install(nextTournamentTurn(event.current));
  }

  function activate(index: number): void {
    if (event.current?.phase !== TournamentPhase.playing) return;
    clock.synchronize();
    commit(activateSession(current.current, index, false));
  }

  function synchronizedTournament(): TournamentState | null {
    clock.synchronize();
    return event.current;
  }

  return {
    tournament,
    session,
    start,
    install,
    startTurn,
    nextTurn,
    activate,
    synchronizedTournament,
  };
}
