import { useState } from 'react';
import { browserStore } from './use-saved-preferences.ts';
import { readTournaments, retainTournament, writeTournaments } from '../tournament/storage.ts';
import type { TournamentRecord } from '../tournament/rules.ts';

export function useTournamentHistory() {
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readTournaments(store));
  function save(event: TournamentRecord): void {
    const items = retainTournament(history.items, event);
    const saved = writeTournaments(store, items);
    setHistory({ items, unavailable: history.unavailable || !saved });
  }
  return { history, save };
}
