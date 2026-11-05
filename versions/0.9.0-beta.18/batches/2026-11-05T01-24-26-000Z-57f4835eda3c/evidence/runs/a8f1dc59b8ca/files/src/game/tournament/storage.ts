import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { readTournament, tournamentRecord } from './format.ts';
import { championOf } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const ENVELOPE_VERSION = 3;
const ENVELOPE_KEYS = ['v', 'items'];
const RETAINED_RECORDS = 10;

// Finished tournaments, newest first. Unavailable storage keeps them in memory for this visit.
export interface SavedTournaments {
  readonly items: readonly Tournament[];
  readonly available: boolean;
}

function isFinished(tournament: Tournament | null): tournament is Tournament {
  return tournament !== null && championOf(tournament) !== null;
}

// A value that fails to parse or validate reads as no records and stays untouched until a save.
function readItems(text: string): readonly Tournament[] {
  const value = parseJson(text);
  if (!isJsonObject(value) || !hasExactKeys(value, ENVELOPE_KEYS)) return [];
  if (value.v !== ENVELOPE_VERSION || !Array.isArray(value.items)) return [];
  const items = value.items.map((item: unknown) => readTournament(item));
  return items.every(isFinished) ? items : [];
}

export function readPastTournaments(store: PreferenceStore | null): SavedTournaments {
  if (!store) return { items: [], available: false };
  try {
    const text = store.getItem(TOURNAMENTS_KEY);
    return { items: text ? readItems(text) : [], available: true };
  } catch {
    return { items: [], available: false };
  }
}

// Keeps the newest records. After a failed read or write the list stays in memory for the rest
// of the visit, and a failed read means a save can't replace records this page never read.
export function saveTournament(
  store: PreferenceStore | null,
  past: SavedTournaments,
  tournament: Tournament,
): SavedTournaments {
  const items = [tournament, ...past.items].slice(0, RETAINED_RECORDS);
  if (!store || !past.available) return { items, available: false };
  try {
    store.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({ v: ENVELOPE_VERSION, items: items.map(tournamentRecord) }),
    );
    return { items, available: true };
  } catch {
    return { items, available: false };
  }
}
