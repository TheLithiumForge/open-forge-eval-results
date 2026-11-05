import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { DATA_KEYS, readTournament, tournamentData } from './format.ts';
import { champion } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const RECORDS_VERSION = 3;
const RECORDS_KEPT = 10;
const RECORDS_KEYS = ['v', 'items'] as const;

// Finished tournaments, newest first. saving is false when the browser store refused us, so the
// list lasts only for this page.
export interface SavedTournaments {
  readonly items: readonly Tournament[];
  readonly saving: boolean;
}

// A value that fails to parse or validate reads as no records and stays until the next save.
function decodeRecords(text: string | null): readonly Tournament[] {
  if (!text) return [];
  const value = parseJson(text);
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, RECORDS_KEYS) ||
    value.v !== RECORDS_VERSION ||
    !Array.isArray(value.items)
  )
    return [];
  const items: Tournament[] = [];
  for (const item of value.items) {
    const tournament = isJsonObject(item) && hasExactKeys(item, DATA_KEYS) && readTournament(item);
    if (!tournament || champion(tournament) === null) return [];
    items.push(tournament);
  }
  return items;
}

export function readTournaments(store: PreferenceStore | null): SavedTournaments {
  if (!store) return { items: [], saving: false };
  try {
    return { items: decodeRecords(store.getItem(TOURNAMENTS_KEY)), saving: true };
  } catch {
    return { items: [], saving: false };
  }
}

// Adds a finished tournament and keeps the newest ten. After a refused read the stored list is
// unknown, so nothing is written over it.
export function saveTournament(
  store: PreferenceStore | null,
  saved: SavedTournaments,
  tournament: Tournament,
): SavedTournaments {
  const items = [tournament, ...saved.items].slice(0, RECORDS_KEPT);
  if (!store || !saved.saving) return { items, saving: false };
  try {
    const value = { v: RECORDS_VERSION, items: items.map(tournamentData) };
    store.setItem(TOURNAMENTS_KEY, JSON.stringify(value));
    return { items, saving: true };
  } catch {
    return { items, saving: false };
  }
}
