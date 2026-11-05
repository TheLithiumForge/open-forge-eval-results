import { useRef, useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { readPastTournaments, savePastTournament } from './records.ts';
import type { Tournament } from './rules.ts';

// Reads finished tournaments once. Only a tournament finished through play writes the list.
export function usePastTournaments() {
  const [store] = useState(browserStore);
  const [past, setPast] = useState(() => readPastTournaments(store));
  const current = useRef(past);
  function save(record: Tournament): void {
    current.current = savePastTournament(store, current.current, record);
    setPast(current.current);
  }
  return { past, save };
}
