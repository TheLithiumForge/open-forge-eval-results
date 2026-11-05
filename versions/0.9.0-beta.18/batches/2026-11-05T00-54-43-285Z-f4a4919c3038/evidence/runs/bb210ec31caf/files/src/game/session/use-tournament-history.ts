import { useRef, useState } from 'react';
import { browserStore } from './use-saved-preferences.ts';
import { readTournamentHistory, saveTournamentHistory } from '../tournament/storage.ts';
import type { TournamentArchive } from '../tournament/format.ts';

export function useTournamentHistory() {
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readTournamentHistory(store));
  const current = useRef(history);
  function save(archive: TournamentArchive): void {
    current.current = saveTournamentHistory(store, current.current.items, archive);
    setHistory(current.current);
  }
  return { ...history, save };
}
