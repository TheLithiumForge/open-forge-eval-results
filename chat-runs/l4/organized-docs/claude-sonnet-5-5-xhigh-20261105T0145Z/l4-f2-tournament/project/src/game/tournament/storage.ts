import { isJsonObject, hasExactKeys, parseJson } from '../saved-format.ts';
import { encodeTournament, parseTournament } from './format.ts';
import { isFinished } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const TOURNAMENTS_ENVELOPE_VERSION = 3;
const TOURNAMENTS_RETAINED = 10;
export const TournamentStorageNotice = "Progress won't be saved on this device.";

// `available` is false when the browser store could not be reached or read.
export interface SavedTournaments {
  readonly items: readonly Tournament[];
  readonly available: boolean;
}

const ENVELOPE_KEYS = ['v', 'items'] as const;

// A stored value that cannot be read is treated as empty and stays untouched until the next save.
export function readTournaments(store: PreferenceStore | null): SavedTournaments {
  const empty: SavedTournaments = { items: [], available: store !== null };
  try {
    const text = store?.getItem(TOURNAMENTS_KEY);
    if (!text) return empty;
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ENVELOPE_KEYS) ||
      value.v !== TOURNAMENTS_ENVELOPE_VERSION ||
      !Array.isArray(value.items)
    )
      return empty;
    const items: Tournament[] = [];
    for (const record of value.items) {
      const item = parseTournament(record);
      if (!item || !isFinished(item)) return empty;
      items.push(item);
    }
    return { items, available: true };
  } catch {
    return { items: [], available: false };
  }
}

// A saved list keeps its newest records, and the newest record is last.
export function keepNewest(items: readonly Tournament[], added: Tournament): readonly Tournament[] {
  return [...items, added].slice(-TOURNAMENTS_RETAINED);
}

// Reports whether the browser kept the list, so the screen can say when progress is not saved.
export function writeTournaments(
  store: PreferenceStore | null,
  items: readonly Tournament[],
): SavedTournaments {
  try {
    if (!store) return { items, available: false };
    const records: unknown[] = items.map((item) => JSON.parse(encodeTournament(item)));
    store.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({ v: TOURNAMENTS_ENVELOPE_VERSION, items: records }),
    );
    return { items, available: true };
  } catch {
    return { items, available: false };
  }
}
