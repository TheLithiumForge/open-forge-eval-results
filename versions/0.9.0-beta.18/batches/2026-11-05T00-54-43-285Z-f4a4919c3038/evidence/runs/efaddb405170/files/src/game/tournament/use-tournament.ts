import { useRef, useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { tournamentDeals } from '../session/tournament-deals.ts';
import {
  advanceTournament,
  createTournament,
  recordGame,
  startTurn,
  TournamentPhase,
} from './rules.ts';
import { readTournaments, saveTournament } from './storage.ts';
import type { TournamentState } from './rules.ts';
import type { GameState } from '../game.ts';

export function useTournament() {
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readTournaments(store));
  const historyRef = useRef(history);
  const [state, setState] = useState<TournamentState | null>(null);
  const current = useRef(state);
  function commit(next: TournamentState | null, remember = true): void {
    const previous = current.current;
    current.current = next;
    setState(next);
    if (remember && next?.phase === TournamentPhase.complete && next !== previous) {
      const saved = saveTournament(store, historyRef.current.items, next);
      historyRef.current = saved;
      setHistory(saved);
    }
  }
  return {
    state,
    history,
    start(names: readonly string[]): void {
      commit(createTournament(names, tournamentDeals(names.length)));
    },
    startTurn(): void {
      if (current.current) commit(startTurn(current.current));
    },
    advance(): void {
      if (current.current) commit(advanceTournament(current.current));
    },
    update(game: GameState): void {
      if (current.current) commit(recordGame(current.current, game));
    },
    load(next: TournamentState | null): void {
      commit(
        next?.phase === TournamentPhase.playing ? { ...next, phase: TournamentPhase.ready } : next,
      );
    },
    view(next: TournamentState): void {
      commit(next, false);
    },
    clear(): void {
      commit(null);
    },
  };
}
