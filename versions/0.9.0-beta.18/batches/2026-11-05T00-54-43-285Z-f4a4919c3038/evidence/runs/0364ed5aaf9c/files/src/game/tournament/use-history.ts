import { useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { encodeTournament } from './format.ts';
import { readTournaments, saveTournaments, TOURNAMENT_HISTORY_LIMIT } from './storage.ts';
import type { Tournament } from './rules.ts';

export function useTournamentHistory() {
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readTournaments(store));
  function save(tournament: Tournament): void {
    const text = encodeTournament(tournament);
    const items = [
      tournament,
      ...history.items.filter((item) => encodeTournament(item) !== text),
    ].slice(0, TOURNAMENT_HISTORY_LIMIT);
    const saved = saveTournaments(store, items);
    setHistory({ items, blocked: !saved });
  }
  return { ...history, save };
}
