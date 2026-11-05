import { useRef, useState } from 'react';
import { freshBoardCode } from '../session/fresh-board.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import {
  readPastTournaments,
  rememberTournament,
  writePastTournaments,
} from './past-tournaments.ts';
import { resolvePlayers } from './players.ts';
import { decodeTournament, encodeTournament } from './tournament-format.ts';
import { TournamentNotice } from './tournament-labels.ts';
import { finishTurn, idleSession, nextTurn, openSession, startTurn } from './tournament-session.ts';
import { createTournament, isFinished, isPlayerCount } from './tournament.ts';
import type { TournamentSession } from './tournament-session.ts';
import type { Tournament, TurnResult } from './tournament.ts';

interface TournamentState {
  readonly session: TournamentSession;
  readonly past: readonly Tournament[];
}

// Keeps the tournament on screen and the finished ones in browser storage. Deals use the grid
// size of the game the tournament was opened from.
export function useTournament(size: number) {
  const [store] = useState(browserStore);
  const [state, setState] = useState<TournamentState>(() => ({
    session: idleSession(),
    past: readPastTournaments(store),
  }));
  const current = useRef(state);

  function show(session: TournamentSession): void {
    const { past } = current.current;
    const { tournament } = session;
    const next = tournament && isFinished(tournament) ? rememberTournament(past, tournament) : past;
    if (next !== past) writePastTournaments(store, next);
    current.current = { session, past: next };
    setState(current.current);
  }

  // The names in a draft come from the setup form. Blank names play under their own label.
  function draft(entries: readonly string[], count: number): Tournament | null {
    const players = isPlayerCount(count) ? resolvePlayers(entries, count) : null;
    if (!players) return null;
    return createTournament(
      players,
      Array.from({ length: count - 1 }, () => freshBoardCode(size)),
    );
  }

  function start(entries: readonly string[], count: number): void {
    const tournament = draft(entries, count);
    show(tournament ? openSession(tournament) : idleSession(TournamentNotice.duplicate));
  }

  // Without a tournament, the setup form is exported as the tournament it would start.
  function exportTournament(entries: readonly string[], count: number): string | null {
    const tournament = current.current.session.tournament ?? draft(entries, count);
    if (!tournament) {
      show(idleSession(TournamentNotice.duplicate));
      return null;
    }
    show({ ...current.current.session, notice: TournamentNotice.exported });
    return encodeTournament(tournament);
  }

  function loadTournament(text: string): void {
    const tournament = decodeTournament(text);
    show(
      tournament
        ? openSession(tournament, TournamentNotice.loaded)
        : { ...current.current.session, notice: TournamentNotice.invalid },
    );
  }

  return {
    session: state.session,
    past: state.past,
    start,
    exportTournament,
    loadTournament,
    startTurn: () => show(startTurn(current.current.session)),
    finishTurn: (result: TurnResult) => show(finishTurn(current.current.session, result)),
    nextTurn: () => show(nextTurn(current.current.session)),
    leave: () => show(idleSession(TournamentNotice.left)),
    reset: () => show(idleSession()),
    viewPast: (tournament: Tournament) => show(openSession(tournament)),
  };
}
