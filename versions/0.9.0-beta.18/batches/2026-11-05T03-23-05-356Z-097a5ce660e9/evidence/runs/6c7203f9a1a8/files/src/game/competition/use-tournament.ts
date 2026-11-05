import { useRef, useState } from 'react';
import { activateCard, createGame, isWon } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { useGameClock } from '../session/use-game-clock.ts';
import { encodeTournamentTransfer } from './format.ts';
import type { TournamentTransfer } from './format.ts';
import type { TournamentSetup } from './format-validation.ts';
import {
  browserTournamentStore,
  readTournamentHistory,
  writeTournamentHistory,
} from './storage.ts';
import { createTournament, tournamentDealSizes } from './pairing.ts';
import {
  finishTurn,
  nextMatch,
  nextTurn,
  startTurn,
  tournamentMatch,
  tournamentPlayer,
} from './rules.ts';
import { completedSetup, emptyTournamentSession, tickTournament } from './tournament-session.ts';
import type { TournamentStore, TournamentHistory } from './storage.ts';
import type { Tournament } from './rules.ts';
import type { PlayerCount } from './rules.ts';
import type { TournamentSession } from './tournament-session.ts';

export function useTournament(announce: (message: string) => void) {
  const [store] = useState<TournamentStore | null>(browserTournamentStore);
  const [history, setHistory] = useState<TournamentHistory>(() => readTournamentHistory(store));
  const [session, setSession] = useState(emptyTournamentSession);
  const current = useRef(session);

  function commit(next: TournamentSession): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }

  const clock = useGameClock(session, current, commit, tickTournament);

  function saveCompleted(tournament: Tournament): void {
    const record: TournamentTransfer = {
      setup: completedSetup(tournament),
      tournament,
      game: null,
    };
    const records = [record, ...history.records].slice(0, 10);
    setHistory({ available: writeTournamentHistory(store, records), records });
  }

  function begin(playerCount: PlayerCount, players: readonly string[]): boolean {
    const codes: string[] = [];
    const used = new Set<string>();
    for (const size of tournamentDealSizes(playerCount)) {
      let code = freshBoardCode(size);
      while (used.has(code)) code = freshBoardCode(size);
      used.add(code);
      codes.push(code);
    }
    const tournament = createTournament(players, codes);
    if (!tournament) return false;
    clock.reset();
    commit({ ...emptyTournamentSession(current.current.generation + 1), tournament });
    const name = tournamentPlayer(tournament);
    if (name) announce(`Now playing: ${name}`);
    return true;
  }

  function startCurrentTurn(): void {
    const latest = current.current;
    const tournament = latest.tournament;
    if (!tournament || tournament.phase !== 'ready') return;
    const match = tournamentMatch(tournament);
    if (!match) return;
    clock.reset();
    commit({
      ...latest,
      game: createGame(match.boardCode),
      generation: latest.generation + 1,
      tournament: startTurn(tournament),
    });
  }

  function activate(index: number): void {
    clock.synchronize();
    const latest = current.current;
    const tournament = latest.tournament;
    if (!tournament || tournament.phase !== 'playing' || !latest.game) return;
    const game = activateCard(latest.game, index);
    if (game === latest.game) return;
    const finished = isWon(game);
    const next = finished ? finishTurn(tournament, game) : tournament;
    const final = next.phase === 'complete';
    commit({ ...latest, game: final ? null : game, tournament: next });
    if (finished) {
      const player = tournamentPlayer(tournament) ?? 'Player';
      const summary = `${player} finished in ${game.moves} moves and ${formatElapsed(game.elapsedMs)}.`;
      const match = tournamentMatch(next);
      announce(
        next.phase === 'next-match'
          ? `${summary} ${match?.winner ?? 'The match winner'} wins the match.`
          : final
            ? `${summary} Champion: ${next.rounds.at(-1)?.matches[0]?.winner ?? player}.`
            : summary,
      );
      if (final) saveCompleted(next);
    }
  }

  function advanceTurn(): void {
    const tournament = current.current.tournament;
    if (!tournament) return;
    const next = nextTurn(tournament);
    if (next === tournament) return;
    clock.reset();
    commit({
      ...current.current,
      game: null,
      generation: current.current.generation + 1,
      tournament: next,
    });
    const name = tournamentPlayer(next);
    if (name) announce(`Now playing: ${name}`);
  }

  function advanceMatch(): void {
    const tournament = current.current.tournament;
    if (!tournament) return;
    const next = nextMatch(tournament);
    if (next === tournament) return;
    clock.reset();
    commit({
      ...current.current,
      game: null,
      generation: current.current.generation + 1,
      tournament: next,
    });
    const name = tournamentPlayer(next);
    const round = next.rounds[next.roundIndex]?.name;
    if (name) announce(`${round ? `Round: ${round}. ` : ''}Now playing: ${name}`);
  }

  function leave(): void {
    clock.reset();
    commit(emptyTournamentSession(current.current.generation + 1));
    announce('Tournament left.');
  }

  function load(transfer: TournamentTransfer): void {
    clock.reset();
    const next: TournamentSession = {
      game: transfer.game,
      generation: current.current.generation + 1,
      paused: false,
      tournament: transfer.tournament,
    };
    commit(next);
    if (transfer.tournament?.phase === 'complete') saveCompleted(transfer.tournament);
    const tournament = transfer.tournament;
    const name = tournament ? tournamentPlayer(tournament) : undefined;
    announce(
      tournament?.phase === 'ready' || tournament?.phase === 'playing'
        ? `Now playing: ${name ?? 'Player'}`
        : tournament?.phase === 'complete'
          ? `Champion: ${tournament.rounds.at(-1)?.matches[0]?.winner ?? 'Unknown'}`
          : tournament?.phase === 'next-turn'
            ? 'Select Next turn to continue.'
            : tournament?.phase === 'next-match'
              ? 'Select Next match to continue.'
              : 'Tournament loaded.',
    );
  }

  function exportTournament(setup: TournamentSetup): string | null {
    clock.synchronize();
    return encodeTournamentTransfer(setup, current.current.tournament, current.current.game);
  }

  return {
    activate,
    advanceMatch,
    advanceTurn,
    begin,
    exportTournament,
    history,
    leave,
    load,
    session,
    startCurrentTurn,
  };
}
