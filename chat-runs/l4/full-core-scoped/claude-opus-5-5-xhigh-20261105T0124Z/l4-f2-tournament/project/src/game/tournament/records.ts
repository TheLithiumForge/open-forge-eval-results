import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { matchesJson, readBracket } from './format.ts';
import { isFinished } from './rules.ts';
import type { Tournament } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const RECORDS_VERSION = 3;
export const RECORDS_KEPT = 10;
const ENVELOPE_KEYS = ['v', 'items'];
const ITEM_KEYS = ['matches', 'players'];

// A value that fails to parse or validate reads as no records, and stays until the next save.
export function decodeRecords(text: string | null): readonly Tournament[] {
  if (!text) return [];
  const value = parseJson(text);
  if (!isJsonObject(value) || !hasExactKeys(value, ENVELOPE_KEYS)) return [];
  if (value.v !== RECORDS_VERSION || !Array.isArray(value.items)) return [];
  if (value.items.length > RECORDS_KEPT) return [];
  const records: Tournament[] = [];
  for (const item of value.items) {
    const record =
      isJsonObject(item) && hasExactKeys(item, ITEM_KEYS)
        ? readBracket(item.players, item.matches, false)
        : null;
    if (!record || !isFinished(record)) return [];
    records.push(record);
  }
  return records;
}

export function encodeRecords(records: readonly Tournament[]): string {
  return JSON.stringify({
    v: RECORDS_VERSION,
    items: records.map((record) => ({ matches: matchesJson(record), players: record.players })),
  });
}

// Newest first. Saving drops the oldest once the list holds its limit.
export function keepRecord(
  records: readonly Tournament[],
  finished: Tournament,
): readonly Tournament[] {
  return [{ ...finished, reviewing: false }, ...records].slice(0, RECORDS_KEPT);
}
