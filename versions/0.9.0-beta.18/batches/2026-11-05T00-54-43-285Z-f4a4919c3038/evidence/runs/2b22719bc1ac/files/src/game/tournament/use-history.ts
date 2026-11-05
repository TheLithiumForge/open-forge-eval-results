import { useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { readTournaments, saveTournaments } from './storage.ts';
import type { TournamentState } from './rules.ts';

export interface TournamentHistory {
  readonly items: readonly TournamentState[];
  readonly blocked: boolean;
  save(tournament: TournamentState): void;
}

export function useHistory() {
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readTournaments(store));
  function save(tournament: TournamentState): void {
    const items = [tournament, ...history.items].slice(0, 10);
    const saved = saveTournaments(store, items);
    setHistory({ items, blocked: !saved });
  }
  return { ...history, save };
}
