import { useRef, useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { readTournaments, retainTournament, writeTournaments } from './storage.ts';
import type { TournamentState } from './model.ts';

export function useTournamentHistory() {
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readTournaments(store));
  const current = useRef(history);
  function save(tournament: TournamentState): void {
    const items = retainTournament(current.current.items, tournament);
    const next = {
      items,
      blocked: writeTournaments(store, items).blocked || current.current.blocked,
    };
    current.current = next;
    setHistory(next);
  }
  return { ...history, save };
}
