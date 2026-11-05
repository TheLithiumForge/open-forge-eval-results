import { useEffect, useRef, useState } from 'react';
import { freshBoardCode } from './fresh-board.ts';
import { createTournament, roundSizes } from '../tournament/bracket.ts';
import { activateTournament, nextMatch, nextTurn, startTurn } from '../tournament/rules.ts';
import { encodeTournament } from '../tournament/format.ts';
import {
  getTournamentStore,
  readTournaments,
  TOURNAMENT_RETENTION,
  writeTournaments,
} from '../tournament/storage.ts';
import type { TournamentDraft } from '../tournament/format.ts';
import type { TournamentLoad } from '../tournament/format-read.ts';
import { readTournamentText } from '../tournament/format-read.ts';
import type { TournamentRecord, TournamentState } from '../tournament/model.ts';
import { useTournamentClock } from './use-tournament-clock.ts';

function tournamentCodes(count: 4 | 8): string[] {
  const used = new Set<string>();
  const codes: string[] = [];
  roundSizes(count).forEach((size, roundIndex) => {
    const matches = count / 2 ** (roundIndex + 1);
    for (let index = 0; index < matches; index += 1) {
      let code = freshBoardCode(size);
      while (used.has(code)) code = freshBoardCode(size);
      used.add(code);
      codes.push(code);
    }
  });
  return codes;
}

export function useTournament() {
  const [store] = useState(getTournamentStore);
  const [initial] = useState(() => readTournaments(store));
  const [past, setPast] = useState(initial.items);
  const [storageAvailable, setStorageAvailable] = useState(initial.available);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [generation, setGeneration] = useState(0);
  const current = useRef<TournamentState | null>(tournament);

  function commit(next: TournamentState | null): void {
    if (next === current.current) return;
    current.current = next;
    setTournament(next);
    if (next?.status === 'complete') {
      const record: TournamentRecord = {
        playerCount: next.playerCount,
        players: next.players,
        rounds: next.rounds,
      };
      setPast((items) => [record, ...items].slice(0, TOURNAMENT_RETENTION));
    }
  }

  const clock = useTournamentClock(tournament, generation, current, (next) => commit(next));

  useEffect(() => {
    const saved = writeTournaments(store, past);
    setStorageAvailable(saved);
  }, [past, store]);

  function start(names: readonly string[], count: 4 | 8): boolean {
    const next = createTournament(names, tournamentCodes(count));
    if (!next) return false;
    clock.reset();
    setGeneration((value) => value + 1);
    commit(next);
    return true;
  }

  function beginTurn(): void {
    if (!current.current) return;
    clock.reset();
    setGeneration((value) => value + 1);
    commit(startTurn(current.current));
  }

  function activate(index: number): void {
    clock.synchronize();
    const active = current.current;
    if (active) commit(activateTournament(active, index));
  }

  function continueTurn(): void {
    const active = current.current;
    if (!active) return;
    clock.reset();
    setGeneration((value) => value + 1);
    commit(nextTurn(active));
  }

  function continueMatch(): void {
    const active = current.current;
    if (!active) return;
    clock.reset();
    setGeneration((value) => value + 1);
    commit(nextMatch(active));
  }

  function exportCurrent(draft: TournamentDraft): string {
    clock.synchronize();
    return encodeTournament(current.current, draft);
  }

  function restore(value: TournamentLoad): void {
    clock.reset();
    setGeneration((generation) => generation + 1);
    commit(value.kind === 'setup' ? null : value.state);
  }

  function leave(): void {
    clock.reset();
    setGeneration((generation) => generation + 1);
    commit(null);
  }

  return {
    activate,
    beginTurn,
    continueMatch,
    continueTurn,
    decode: readTournamentText,
    exportCurrent,
    leave,
    past,
    restore,
    start,
    storageAvailable,
    tournament,
  };
}
