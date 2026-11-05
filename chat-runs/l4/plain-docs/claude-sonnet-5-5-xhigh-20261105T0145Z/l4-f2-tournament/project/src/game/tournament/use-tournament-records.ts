import { useRef, useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { appendRecord, readRecords, saveRecords } from './records.ts';
import type { SavedRecords } from './records.ts';
import type { Tournament } from './types.ts';

export interface Records extends SavedRecords {
  add(tournament: Tournament): void;
}

// Past tournaments live above the Tournament screen, so a blocked store still keeps this visit's
// list in memory after the screen closes.
export function useTournamentRecords(): Records {
  const [store] = useState(browserStore);
  const [saved, setSaved] = useState(() => readRecords(store));
  const latest = useRef(saved);

  function add(tournament: Tournament): void {
    const written = saveRecords(store, appendRecord(latest.current.items, tournament));
    latest.current = { items: written.items, blocked: latest.current.blocked || written.blocked };
    setSaved(latest.current);
  }

  return { ...saved, add };
}
