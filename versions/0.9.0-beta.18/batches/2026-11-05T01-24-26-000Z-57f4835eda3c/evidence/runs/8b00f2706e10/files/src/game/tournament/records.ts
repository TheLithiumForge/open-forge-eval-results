import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { readTournament, tournamentRecord } from './exchange.ts';
import { isFinished } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const ENVELOPE_VERSION = 3;
const ENVELOPE_KEYS = ['v', 'items'];
const KEPT_RECORDS = 10;

export interface PastTournaments {
  // Newest first.
  readonly records: readonly Tournament[];
  // False when this device can't keep them. The list then lasts only for this page.
  readonly saving: boolean;
}

function isFinishedRecord(record: Tournament | null): record is Tournament {
  return record !== null && isFinished(record);
}

// A value that fails to parse or validate reads as no records, and the read leaves it in place.
function decodeRecords(text: string | null): readonly Tournament[] {
  if (!text) return [];
  const value = parseJson(text);
  if (!isJsonObject(value) || !hasExactKeys(value, ENVELOPE_KEYS) || value.v !== ENVELOPE_VERSION)
    return [];
  if (!Array.isArray(value.items)) return [];
  const records = value.items.map(readTournament);
  const finished = records.filter(isFinishedRecord);
  return finished.length === records.length ? finished : [];
}

export function readPastTournaments(store: PreferenceStore | null): PastTournaments {
  if (!store) return { records: [], saving: false };
  try {
    return { records: decodeRecords(store.getItem(TOURNAMENTS_KEY)), saving: true };
  } catch {
    return { records: [], saving: false };
  }
}

// Keeps the newest records. After a blocked read the stored value stays untouched.
export function savePastTournament(
  store: PreferenceStore | null,
  past: PastTournaments,
  record: Tournament,
): PastTournaments {
  const records = [record, ...past.records].slice(0, KEPT_RECORDS);
  if (!store || !past.saving) return { records, saving: false };
  try {
    const items = records.map(tournamentRecord);
    store.setItem(TOURNAMENTS_KEY, JSON.stringify({ v: ENVELOPE_VERSION, items }));
    return { records, saving: true };
  } catch {
    return { records, saving: false };
  }
}
