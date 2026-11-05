import { useRef, useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { readTournaments, saveTournaments, withNewest } from './storage.ts';
import type { PastTournaments } from './storage.ts';
import type { Tournament } from './rules.ts';

// The past tournaments live above the tournament screen, so a blocked store still keeps them
// in this page while the screen is closed and opened again.
export function useRecords() {
  const [store] = useState(browserStore);
  const [past, setPast] = useState(() => readTournaments(store));
  const current = useRef<PastTournaments>(past);

  function save(finished: Tournament): void {
    const next = saveTournaments(store, withNewest(current.current.records, finished));
    current.current = next;
    setPast(next);
  }

  return { past, save };
}
