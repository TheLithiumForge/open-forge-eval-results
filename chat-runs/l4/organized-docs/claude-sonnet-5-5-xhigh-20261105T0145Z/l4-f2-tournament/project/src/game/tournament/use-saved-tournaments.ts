import { useRef, useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { keepNewest, readTournaments, writeTournaments } from './storage.ts';
import type { Tournament } from './rules.ts';

export type RecordTournament = (tournament: Tournament) => void;

// Lives with the game rather than the tournament screen, so tournaments that finish while the
// browser store is blocked still show in the list until the page is reloaded.
export function useSavedTournaments() {
  const [store] = useState(browserStore);
  const [saved, setSaved] = useState(() => readTournaments(store));
  const latest = useRef(saved);
  function record(tournament: Tournament): void {
    const next = writeTournaments(store, keepNewest(latest.current.items, tournament));
    latest.current = next;
    setSaved(next);
  }
  return { saved, record };
}
