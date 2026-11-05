import { isJsonObject, hasExactKeys, isWithinBytes, parseJson } from '../saved-format.ts';
import { encodeTournament } from './format.ts';
import { readTournamentRecord } from './validation.ts';
import type { TournamentRecord } from './model.ts';

const TOURNAMENTS_KEY = 'np3:tournaments';
const ENVELOPE_VERSION = 3;
const MAX_HISTORY = 10;
const MAX_STORAGE_BYTES = 1_048_576;

interface TournamentStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface TournamentHistory {
  readonly records: readonly TournamentRecord[];
  readonly available: boolean;
}

export function readTournamentHistory(store: TournamentStore | null): TournamentHistory {
  if (!store) return { records: [], available: false };
  try {
    const text = store.getItem(TOURNAMENTS_KEY);
    if (!text) return { records: [], available: true };
    if (!isWithinBytes(text, MAX_STORAGE_BYTES)) return { records: [], available: true };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['items', 'v']) ||
      value.v !== ENVELOPE_VERSION ||
      !Array.isArray(value.items)
    )
      return { records: [], available: true };
    const records = value.items.map(readTournamentRecord);
    return records.some((record) => !record)
      ? { records: [], available: true }
      : {
          records: records
            .filter((record): record is TournamentRecord => record !== null)
            .slice(0, MAX_HISTORY),
          available: true,
        };
  } catch {
    return { records: [], available: false };
  }
}

export function saveTournamentHistory(
  store: TournamentStore | null,
  record: TournamentRecord,
  previous: readonly TournamentRecord[],
): TournamentHistory {
  if (!store) return { records: [record, ...previous].slice(0, MAX_HISTORY), available: false };
  const identity = encodeTournament(record);
  const records = [record, ...previous.filter((item) => encodeTournament(item) !== identity)].slice(
    0,
    MAX_HISTORY,
  );
  try {
    store.setItem(TOURNAMENTS_KEY, JSON.stringify({ v: ENVELOPE_VERSION, items: records }));
    return { records, available: true };
  } catch {
    return { records, available: false };
  }
}
