import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { TournamentRecord } from './model.ts';
import { readTournamentRecord } from './validation.ts';

const TOURNAMENTS_KEY = 'neon-pairs.tournaments.v1';
const STORAGE_VERSION = 3;
const PAST_TOURNAMENT_LIMIT = 10;
const STORAGE_MAX_BYTES = 262_144;

function recordKey(record: TournamentRecord): string {
  const firstCode = record.rounds[0]?.matches[0]?.boardCode ?? '';
  return `${record.startedAtMs}:${firstCode}`;
}

export function readPastTournaments(store: PreferenceStore | null): readonly TournamentRecord[] {
  try {
    const text = store?.getItem(TOURNAMENTS_KEY);
    if (!text || !isWithinBytes(text, STORAGE_MAX_BYTES)) return [];
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['v', 'items']) ||
      value.v !== STORAGE_VERSION ||
      !Array.isArray(value.items) ||
      value.items.length > PAST_TOURNAMENT_LIMIT
    )
      return [];
    const records: TournamentRecord[] = [];
    for (const item of value.items) {
      const record = readTournamentRecord(item);
      if (!record) return [];
      records.push(record);
    }
    return records;
  } catch {
    return [];
  }
}

export function prependPastTournament(
  records: readonly TournamentRecord[],
  record: TournamentRecord,
): readonly TournamentRecord[] {
  const key = recordKey(record);
  return [record, ...records.filter((item) => recordKey(item) !== key)].slice(
    0,
    PAST_TOURNAMENT_LIMIT,
  );
}

export function hasSavedPastTournaments(
  store: PreferenceStore | null,
  records: readonly TournamentRecord[],
): boolean {
  try {
    store?.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({ v: STORAGE_VERSION, items: records.slice(0, PAST_TOURNAMENT_LIMIT) }),
    );
    return store !== null;
  } catch {
    return false;
  }
}
