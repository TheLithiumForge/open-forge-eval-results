import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { readTournament, tournamentRecord } from './format.ts';
import { champion } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const ENVELOPE_VERSION = 3;
const ENVELOPE_KEYS = ['v', 'items'];
export const PAST_LIMIT = 10;

// Finished tournaments, newest first. Saving is false when the browser store is blocked, so
// records only last for this visit.
export interface SavedTournaments {
  readonly records: readonly Tournament[];
  readonly saving: boolean;
}

// A stored value that fails to parse or validate reads as no records, without an error, and
// stays untouched until the next save replaces it.
export function readPast(store: PreferenceStore | null): SavedTournaments {
  if (!store) return { records: [], saving: false };
  let text: string | null;
  try {
    text = store.getItem(TOURNAMENTS_KEY);
  } catch {
    return { records: [], saving: false };
  }
  return { records: text ? decodePast(text) : [], saving: true };
}

function decodePast(text: string): readonly Tournament[] {
  const value = parseJson(text);
  if (!isJsonObject(value) || !hasExactKeys(value, ENVELOPE_KEYS)) return [];
  if (value.v !== ENVELOPE_VERSION || !Array.isArray(value.items)) return [];
  const records: Tournament[] = [];
  for (const item of value.items) {
    const record = readTournament(item);
    if (!record || champion(record) === null) return [];
    records.push(record);
  }
  return records.slice(0, PAST_LIMIT);
}

// Saving a record keeps the newest ten and drops older ones. Only this feature's key is written.
export function addRecord(
  store: PreferenceStore | null,
  records: readonly Tournament[],
  record: Tournament,
): SavedTournaments {
  const next = [record, ...records].slice(0, PAST_LIMIT);
  try {
    if (!store) return { records: next, saving: false };
    const items = next.map(tournamentRecord);
    store.setItem(TOURNAMENTS_KEY, JSON.stringify({ v: ENVELOPE_VERSION, items }));
    return { records: next, saving: true };
  } catch {
    return { records: next, saving: false };
  }
}
