import { useRef, useState } from 'react';
import {
  activateTournamentCard,
  createTournament,
  nextTournamentMatch,
  nextTournamentTurn,
  startTournamentTurn,
  toPastTournament,
} from '../competition/transitions.ts';
import { decodeTournament, encodeTournament } from '../competition/format.ts';
import { normalizePlayerNames, tournamentMatchPlans } from '../competition/rules.ts';
import { freshBoardCode } from './fresh-board.ts';
import {
  browserTournamentStore,
  readTournamentHistory,
  TOURNAMENT_HISTORY_LIMIT,
  tournamentHistoryKey,
  writeTournamentHistory,
} from './tournament-storage.ts';
import { useTournamentClock } from './use-tournament-clock.ts';
import type {
  PastTournament,
  TournamentPlayerCount,
  TournamentSetup,
  TournamentState,
} from '../competition/types.ts';

export function useTournament(active: boolean) {
  const [store] = useState(() => browserTournamentStore());
  const [initialHistory] = useState(() => readTournamentHistory(store));
  const [past, setPast] = useState<readonly PastTournament[]>(initialHistory.items);
  const [storageAvailable, setStorageAvailable] = useState(initialHistory.available);
  const pastRef = useRef(past);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const current = useRef(tournament);

  function commit(next: TournamentState | null): void {
    if (next === current.current) return;
    current.current = next;
    setTournament(next);
  }

  const clock = useTournamentClock(active, tournament, current, (next) => commit(next));

  function retainPast(record: PastTournament): void {
    const key = tournamentHistoryKey(record);
    const next = [
      record,
      ...pastRef.current.filter((item) => tournamentHistoryKey(item) !== key),
    ].slice(0, TOURNAMENT_HISTORY_LIMIT);
    pastRef.current = next;
    setPast(next);
    setStorageAvailable(writeTournamentHistory(store, next));
  }

  function start(playerCount: TournamentPlayerCount, drafts: readonly string[]): string | null {
    const accepted = normalizePlayerNames(drafts, playerCount);
    if (!accepted.ok) return accepted.error;
    const usedCodes = new Set<string>();
    const boardCodes = tournamentMatchPlans(playerCount).map((plan) => {
      let code = freshBoardCode(plan.size);
      while (usedCodes.has(code)) code = freshBoardCode(plan.size);
      usedCodes.add(code);
      return code;
    });
    const next = createTournament(playerCount, accepted.names, boardCodes);
    if (!next) return 'Unable to start tournament.';
    clock.reset();
    commit(next);
    return null;
  }

  function startTurn(): void {
    const currentTournament = current.current;
    if (!currentTournament) return;
    clock.reset();
    commit(startTournamentTurn(currentTournament));
  }

  function activate(index: number): void {
    clock.synchronize();
    const previous = current.current;
    if (!previous) return;
    const next = activateTournamentCard(previous, index);
    commit(next);
    if (previous.phase !== 'finished' && next.phase === 'finished') {
      const record = toPastTournament(next);
      if (record) retainPast(record);
    }
  }

  function nextTurn(): void {
    const currentTournament = current.current;
    if (!currentTournament) return;
    clock.reset();
    commit(nextTournamentTurn(currentTournament));
  }

  function nextMatch(): void {
    const currentTournament = current.current;
    if (!currentTournament) return;
    clock.reset();
    commit(nextTournamentMatch(currentTournament));
  }

  function leave(): void {
    clock.reset();
    commit(null);
  }

  function exportJson(setup: TournamentSetup): string {
    clock.synchronize();
    return encodeTournament(setup, current.current);
  }

  function loadJson(text: string) {
    const loaded = decodeTournament(text);
    if (loaded.kind === 'invalid') return loaded;
    clock.reset();
    if (loaded.kind === 'setup') {
      commit(null);
    } else {
      commit(loaded.tournament);
      const record = toPastTournament(loaded.tournament);
      if (record) retainPast(record);
    }
    return loaded;
  }

  return {
    tournament,
    past,
    storageAvailable,
    start,
    startTurn,
    activate,
    nextTurn,
    nextMatch,
    leave,
    exportJson,
    loadJson,
    pauseClock: clock.synchronize,
  };
}
