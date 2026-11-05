import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { nextTurn } from './rules.ts';
import { readRecord, toRecord } from './format.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
export const TOURNAMENTS_VERSION = 3;
export const TOURNAMENTS_KEPT = 10;
export const BLOCKED_NOTICE = "Progress won't be saved on this device.";

export interface PastTournaments {
  // Newest first.
  readonly records: readonly Tournament[];
  // The browser store could not be used, so the list lives in this page only.
  readonly blocked: boolean;
}

// Saved data is untrusted. Anything that is not a whole list of finished tournaments reads as empty
// and stays in the store until the next save replaces it.
export function readTournaments(store: PreferenceStore | null): PastTournaments {
  if (!store) return { records: [], blocked: true };
  let text: string | null;
  try {
    text = store.getItem(TOURNAMENTS_KEY);
  } catch {
    return { records: [], blocked: true };
  }
  const empty: PastTournaments = { records: [], blocked: false };
  const value = text ? parseJson(text) : undefined;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['items', 'v']) ||
    value.v !== TOURNAMENTS_VERSION ||
    !Array.isArray(value.items) ||
    value.items.length > TOURNAMENTS_KEPT
  )
    return empty;
  const records = value.items.map(readRecord);
  const isFinished = (record: Tournament | null): record is Tournament =>
    record !== null && record.matches.length > 0 && nextTurn(record) === null;
  return records.every(isFinished) ? { records, blocked: false } : empty;
}

// A saved list keeps its newest records only.
export function withNewest(records: readonly Tournament[], finished: Tournament): Tournament[] {
  return [finished, ...records].slice(0, TOURNAMENTS_KEPT);
}

// The list as the page now has it. Blocked when the store refused it, so the page keeps it in memory.
export function saveTournaments(
  store: PreferenceStore | null,
  records: readonly Tournament[],
): PastTournaments {
  try {
    store?.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({ items: records.map(toRecord), v: TOURNAMENTS_VERSION }),
    );
    return { records, blocked: !store };
  } catch {
    return { records, blocked: true };
  }
}
