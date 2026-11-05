import { useEffect, useRef, useState } from 'react';
import { activateCard, createGame, isWon } from '../game.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { decodeTournament, encodeTournament, tournamentLoadNotice } from './format.ts';
import {
  completeTournamentTurn,
  createTournament,
  nextTournamentMatch,
  nextTournamentTurn,
} from './rules.ts';
import { readPastTournaments, archiveTournament, writePastTournaments } from './storage.ts';
import { tournamentPlan } from './pairing.ts';
import { useTournamentClock } from './use-tournament-clock.ts';
import type { Tournament } from './types.ts';
import type { TournamentStore } from './storage.ts';

export function useTournament(enabled: boolean) {
  const [store] = useState<TournamentStore | null>(() => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  });
  const [initial] = useState(() => readPastTournaments(store));
  const [past, setPast] = useState<readonly Tournament[]>(initial.tournaments);
  const [pastChanged, setPastChanged] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(!initial.available);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [notice, setNotice] = useState('');
  const current = useRef<Tournament | null>(tournament);

  function commit(next: Tournament | null): void {
    current.current = next;
    setTournament(next);
  }

  const clock = useTournamentClock(tournament, enabled, current, commit);

  useEffect(() => {
    if (pastChanged && store) setStorageBlocked(!writePastTournaments(store, past));
  }, [past, pastChanged, store]);

  function archive(completed: Tournament): void {
    setPast((previous) => archiveTournament(previous, completed));
    setPastChanged(true);
  }

  function start(names: readonly string[]): void {
    const players = names.map((name, index) => ({ name, seed: index + 1 }));
    const codes: string[] = [];
    for (const plan of tournamentPlan(players))
      codes.push(freshBoardCode(plan.boardSize, undefined, codes));
    const next = createTournament(names, codes);
    if (!next) return;
    clock.reset();
    setNotice('');
    commit(next);
  }

  function startTurn(): void {
    const active = current.current;
    const match = active?.matches[active.currentMatch];
    if (!active || !match || !match.players[active.currentTurn] || match.winner || active.game)
      return;
    clock.reset();
    commit({ ...active, game: createGame(match.boardCode) });
  }

  function activate(index: number): void {
    clock.synchronize();
    const active = current.current;
    if (!active?.game || isWon(active.game)) return;
    const game = activateCard(active.game, index);
    if (game === active.game) return;
    const next = isWon(game)
      ? completeTournamentTurn({ ...active, game }, game)
      : { ...active, game };
    if (!active.champion && next.champion) archive(next);
    commit(next);
  }

  function nextTurn(): void {
    if (!current.current) return;
    clock.synchronize();
    const active = current.current;
    if (!active) return;
    const next = nextTournamentTurn(active);
    if (next !== active) {
      clock.reset();
      commit(next);
    }
  }

  function nextMatch(): void {
    const active = current.current;
    if (!active) return;
    const next = nextTournamentMatch(active);
    if (next !== active) {
      clock.reset();
      commit(next);
    }
  }

  function load(text: string): boolean {
    const next = decodeTournament(text);
    if (!next) {
      setNotice(tournamentLoadNotice(text));
      return false;
    }
    clock.reset();
    commit(next);
    setNotice('Loaded tournament.');
    if (next.champion) archive(next);
    return true;
  }

  function exportData(): string {
    clock.synchronize();
    const active = current.current ?? past[0];
    if (!active) {
      setNotice('Start or load a tournament before exporting.');
      return '';
    }
    return encodeTournament(current.current ?? active);
  }

  function leave(): void {
    clock.synchronize();
    clock.reset();
    commit(null);
    setNotice('');
  }

  return {
    tournament,
    past,
    storageBlocked,
    notice,
    start,
    startTurn,
    activate,
    nextTurn,
    nextMatch,
    load,
    exportData,
    leave,
    setNotice,
  };
}
