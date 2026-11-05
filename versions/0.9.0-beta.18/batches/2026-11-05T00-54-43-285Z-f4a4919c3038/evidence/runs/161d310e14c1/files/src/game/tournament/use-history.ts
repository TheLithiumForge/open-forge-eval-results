import { useRef, useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { readTournaments, retainTournament, writeTournaments } from './storage.ts';
import type { TournamentState } from './model.ts';

export function useTournamentHistory() {
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readTournaments(store));
  const current = useRef(history);

  function save(state: TournamentState): void {
    const items = retainTournament(current.current.items, state);
    const blocked = !writeTournaments(store, items).saved;
    current.current = { items, blocked };
    setHistory(current.current);
  }

  return { ...history, save };
}
