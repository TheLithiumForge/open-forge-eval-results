import { useRef, useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { addRecord, readPast } from './past-tournaments.ts';
import type { Tournament } from './rules.ts';

// Reads saved tournaments once per page. A finished tournament is kept in memory even when the
// browser refuses to save it, so it still shows for the rest of the visit.
export function usePastTournaments() {
  const [store] = useState(browserStore);
  const [past, setPast] = useState(() => readPast(store));
  const latest = useRef(past);
  function save(record: Tournament): void {
    latest.current = addRecord(store, latest.current.records, record);
    setPast(latest.current);
  }
  return { ...past, save };
}

export type PastTournamentList = ReturnType<typeof usePastTournaments>;
