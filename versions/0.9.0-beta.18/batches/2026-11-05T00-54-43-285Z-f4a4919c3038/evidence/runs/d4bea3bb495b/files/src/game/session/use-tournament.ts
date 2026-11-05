import { useRef, useState } from 'react';
import { createGame } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { describeTurn } from './session.ts';
import { useSessionClock } from './use-session-clock.ts';
import { freshBoardCode } from './fresh-board.ts';
import { parseBoardCode } from '../deck.ts';
import {
  advanceTournament,
  createTournament,
  currentPlayer,
  playTournamentCard,
  startTournamentTurn,
} from '../tournament/rules.ts';
import { TournamentPhase } from '../tournament/model.ts';
import type { TournamentState } from '../tournament/model.ts';
import type { GameState } from '../game.ts';

interface TournamentSession {
  readonly tournament: TournamentState | null;
  readonly game: GameState;
  readonly paused: boolean;
  readonly generation: number;
  readonly celebration: boolean;
}

export function useTournament(
  publish: (text: string) => void,
  completed: (event: TournamentState) => void,
) {
  const [session, setSession] = useState<TournamentSession>(() => ({
    tournament: null,
    game: createGame('np1-4-1'),
    paused: true,
    generation: 0,
    celebration: false,
  }));
  const current = useRef(session);
  function commit(next: TournamentSession): void {
    const tournament = next.tournament ? { ...next.tournament, game: next.game } : null;
    current.current = { ...next, tournament };
    setSession(current.current);
  }
  const clock = useSessionClock(session, current, commit);

  function install(tournament: TournamentState | null, imported = false): void {
    clock.reset();
    commit({
      tournament,
      game: tournament?.game ?? createGame('np1-4-1'),
      paused: imported || tournament?.phase !== TournamentPhase.playing,
      generation: current.current.generation + 1,
      celebration: false,
    });
    if (tournament) {
      if (tournament.phase === TournamentPhase.complete) {
        const winner = tournament.matches.at(-1)!.winner!;
        publish(`Champion: ${tournament.names[winner]}`);
      } else publish(`Now playing: ${tournament.names[currentPlayer(tournament)]}`);
    }
  }

  function start(names: readonly string[]): void {
    const seed = parseBoardCode(freshBoardCode(4))!.seed;
    install(createTournament(names, seed));
  }
  function startTurn(): void {
    const tournament = current.current.tournament;
    if (!tournament) return;
    install(startTournamentTurn(tournament));
  }
  function next(): void {
    const tournament = current.current.tournament;
    if (tournament) install(advanceTournament(tournament));
  }
  function activate(index: number): void {
    clock.synchronize();
    const previous = current.current;
    if (previous.paused || !previous.tournament) return;
    const tournament = playTournamentCard(previous.tournament, index);
    if (tournament === previous.tournament) return;
    commit({
      ...previous,
      tournament,
      game: tournament.game,
      paused: tournament.phase !== TournamentPhase.playing,
      celebration: tournament.phase !== TournamentPhase.playing,
    });
    if (tournament.game.selection.kind !== SelectionKind.one) {
      let text = describeTurn(tournament.game);
      if (tournament.phase === TournamentPhase.complete) {
        text += ` Champion: ${tournament.names[tournament.matches.at(-1)!.winner!]}`;
        completed(tournament);
      }
      publish(text);
    }
  }
  function snapshot(): TournamentState | null {
    clock.synchronize();
    return current.current.tournament;
  }
  return { session, start, install, startTurn, next, activate, snapshot };
}
