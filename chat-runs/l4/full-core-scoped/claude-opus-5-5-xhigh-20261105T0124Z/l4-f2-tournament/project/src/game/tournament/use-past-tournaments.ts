import { useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { decodeRecords, encodeRecords, keepRecord, TOURNAMENTS_KEY } from './records.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

interface PastTournaments {
  readonly records: readonly Tournament[];
  // Blocked storage keeps records for this page only.
  readonly blocked: boolean;
}

// A store that can't be read isn't written either, so an unread value is never replaced.
function readPast(store: PreferenceStore | null): PastTournaments {
  if (!store) return { records: [], blocked: true };
  try {
    return { records: decodeRecords(store.getItem(TOURNAMENTS_KEY)), blocked: false };
  } catch {
    return { records: [], blocked: true };
  }
}

export function usePastTournaments() {
  const [store] = useState(browserStore);
  const [past, setPast] = useState(() => readPast(store));

  // Saves when play finishes a tournament. A load or a leave saves nothing.
  function save(finished: Tournament): void {
    const records = keepRecord(past.records, finished);
    let blocked = past.blocked;
    if (!blocked && store)
      try {
        store.setItem(TOURNAMENTS_KEY, encodeRecords(records));
      } catch {
        blocked = true;
      }
    setPast({ records, blocked });
  }

  return { ...past, save };
}
