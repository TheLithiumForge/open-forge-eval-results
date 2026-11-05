import { useRef, useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { readTournaments, saveTournament } from './storage.ts';
import type { TournamentState } from './rules.ts';

export function useTournamentHistory() {
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readTournaments(store));
  const current = useRef(history);
  function remember(state: TournamentState): void {
    const next = saveTournament(store, current.current, state);
    current.current = next;
    setHistory(next);
  }
  return { history, remember };
}
