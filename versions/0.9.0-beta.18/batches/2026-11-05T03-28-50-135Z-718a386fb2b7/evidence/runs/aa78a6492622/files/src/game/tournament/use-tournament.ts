import { useRef, useState } from 'react';
import { activateCard, isWon } from '../game.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { decodeTournamentFile, encodeTournamentFile, TOURNAMENT_HISTORY_LIMIT } from './format.ts';
import { matchPlans } from './pairing.ts';
import { beginTurn, createTournament, finishTurn, nextMatch, nextTurn } from './rules.ts';
import {
  browserTournamentStore,
  readTournamentHistory,
  writeTournamentHistory,
} from './storage.ts';
import { useTournamentClock } from './use-tournament-clock.ts';
import { unknownTournamentField } from './unknown-field.ts';
import type { Tournament } from './rules.ts';
import type { Entrant, PlayerCount } from './rules.ts';
import type { TournamentDraft, TournamentLoad } from './format.ts';

const TournamentNotice = {
  invalid: 'Invalid tournament JSON.',
  loaded: 'Tournament loaded.',
  saved: 'Tournament saved in Past tournaments.',
} as const;

export function useTournament(enabled = true) {
  const [store] = useState(browserTournamentStore);
  const [initialHistory] = useState(() => readTournamentHistory(store));
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const current = useRef(tournament);
  const past = useRef(initialHistory.tournaments);
  const [pastTournaments, setPastTournaments] = useState(initialHistory.tournaments);
  const [storageAvailable, setStorageAvailable] = useState(initialHistory.available);
  const [notice, setNotice] = useState('');

  function recordCompleted(completed: Tournament): boolean {
    const code = completed.matches[0]?.boardCode ?? '';
    if (
      past.current.some(
        (item) => item.createdAt === completed.createdAt && item.matches[0]?.boardCode === code,
      )
    )
      return true;
    const next = [completed, ...past.current].slice(0, TOURNAMENT_HISTORY_LIMIT);
    past.current = next;
    setPastTournaments(next);
    const saved = writeTournamentHistory(store, next);
    if (saved === 'unavailable') setStorageAvailable(false);
    return saved === 'saved';
  }

  function commit(next: Tournament | null): void {
    const previous = current.current;
    if (next === previous) return;
    current.current = next;
    setTournament(next);
    if (next?.phase === 'finished' && previous?.phase !== 'finished') {
      const saved = recordCompleted(next);
      const winner = next.players.find((player) => player.seed === next.matches.at(-1)?.winnerSeed);
      setNotice(
        saved
          ? `${TournamentNotice.saved} Champion: ${winner?.name ?? ''}`
          : `Tournament finished. Champion: ${winner?.name ?? ''}`,
      );
    }
  }

  const clock = useTournamentClock(tournament, current, commit, enabled);

  function startTournament(names: readonly string[], playerCount: PlayerCount): void {
    const players: Entrant[] = names.map((name, index) => ({ seed: index + 1, name }));
    const used = new Set<string>();
    const codes = matchPlans(playerCount).map((plan) => {
      let code = freshBoardCode(plan.size);
      while (used.has(code)) code = freshBoardCode(plan.size);
      used.add(code);
      return code;
    });
    clock.reset();
    setNotice('');
    commit(createTournament(players, codes, new Date().toISOString()));
  }

  function startTurn(): void {
    const active = current.current;
    if (!active) return;
    clock.reset();
    commit(beginTurn(active));
  }

  function activate(index: number): void {
    clock.synchronize();
    const active = current.current;
    const game = active?.currentGame;
    if (!active || active.phase !== 'playing' || !game) return;
    const nextGame = activateCard(game, index);
    if (nextGame === game) return;
    if (isWon(nextGame)) {
      const next = finishTurn(active, nextGame, new Date().toISOString());
      commit(next);
      if (next.phase === 'turnComplete') setNotice('Turn complete.');
    } else commit({ ...active, currentGame: nextGame });
  }

  function advanceToNextTurn(): void {
    const active = current.current;
    if (!active) return;
    clock.reset();
    commit(nextTurn(active));
    setNotice('');
  }

  function advanceToNextMatch(): void {
    const active = current.current;
    if (!active) return;
    clock.reset();
    commit(nextMatch(active));
    setNotice('');
  }

  function loadTournament(text: string): TournamentLoad | null {
    const loaded = decodeTournamentFile(text);
    if (!loaded) {
      const field = unknownTournamentField(text);
      setNotice(field ? `Unknown field: ${field}.` : TournamentNotice.invalid);
      return null;
    }
    clock.reset();
    setNotice(
      loaded.kind === 'event' &&
        (loaded.tournament.phase === 'ready' || loaded.tournament.phase === 'playing')
        ? ''
        : TournamentNotice.loaded,
    );
    if (loaded.kind === 'setup') commit(null);
    else {
      commit(loaded.tournament);
      if (loaded.tournament.phase === 'finished') recordCompleted(loaded.tournament);
    }
    return loaded;
  }

  function exportTournament(draft: TournamentDraft): string {
    return encodeTournamentFile(current.current ?? past.current[0] ?? null, draft);
  }

  return {
    tournament,
    pastTournaments,
    storageAvailable,
    notice,
    startTournament,
    startTurn,
    activate,
    advanceToNextTurn,
    advanceToNextMatch,
    loadTournament,
    exportTournament,
    synchronizeClock: clock.synchronize,
    resetClock: clock.reset,
    clearNotice: () => setNotice(''),
  };
}
