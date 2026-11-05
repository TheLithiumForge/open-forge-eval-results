import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { hasBodyKeys, readTournament, tournamentBody } from './exchange.ts';
import { isFinished } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './types.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
export const RECORDS_VERSION = 3;
export const RECORDS_MAX = 10;
export const RECORDS_BLOCKED = "Progress won't be saved on this device.";

export interface SavedRecords {
  readonly items: readonly Tournament[];
  readonly blocked: boolean;
}

function readItem(value: unknown): Tournament | undefined {
  if (!isJsonObject(value) || !hasBodyKeys(value)) return undefined;
  const tournament = readTournament(value);
  return tournament && isFinished(tournament) ? tournament : undefined;
}

// Finished tournaments in the order they were saved, oldest first. A value that can't be read is
// treated as empty without being removed: it stays until the next save replaces it.
export function readRecords(store: PreferenceStore | null): SavedRecords {
  let text: string | null | undefined;
  try {
    text = store?.getItem(TOURNAMENTS_KEY);
  } catch {
    return { items: [], blocked: true };
  }
  if (store === null) return { items: [], blocked: true };
  const value = text ? parseJson(text) : undefined;
  if (!isJsonObject(value) || !hasExactKeys(value, ['v', 'items']))
    return { items: [], blocked: false };
  if (value.v !== RECORDS_VERSION || !Array.isArray(value.items))
    return { items: [], blocked: false };
  const items = value.items.map(readItem);
  const read = items.filter((item): item is Tournament => item !== undefined);
  return { items: read.length === items.length ? read : [], blocked: false };
}

// A saved list keeps its newest records and drops older ones when a new record is saved.
export function appendRecord(items: readonly Tournament[], tournament: Tournament): Tournament[] {
  return [...items, tournament].slice(-RECORDS_MAX);
}

// Saves the list and reports whether the browser took it. The list stays in memory either way.
export function saveRecords(
  store: PreferenceStore | null,
  items: readonly Tournament[],
): SavedRecords {
  try {
    if (!store) return { items, blocked: true };
    store.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({ items: items.map(tournamentBody), v: RECORDS_VERSION }),
    );
    return { items, blocked: false };
  } catch {
    return { items, blocked: true };
  }
}
