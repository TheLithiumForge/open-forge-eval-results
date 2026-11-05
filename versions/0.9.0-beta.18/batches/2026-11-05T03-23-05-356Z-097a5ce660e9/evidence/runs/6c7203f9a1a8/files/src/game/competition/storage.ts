import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { decodeTournamentTransfer, encodeTournamentTransfer } from './format.ts';
import type { TournamentTransfer } from './format.ts';

const HISTORY_KEY = 'np3:tournaments';
const HISTORY_VERSION = 3;
const HISTORY_LIMIT = 10;

export interface TournamentStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface TournamentHistory {
  readonly available: boolean;
  readonly records: readonly TournamentTransfer[];
}

export function browserTournamentStore(): TournamentStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readTournamentHistory(store: TournamentStore | null): TournamentHistory {
  if (!store) return { available: false, records: [] };
  try {
    const text = store.getItem(HISTORY_KEY);
    if (!text) return { available: true, records: [] };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['items', 'v']) ||
      value.v !== HISTORY_VERSION ||
      !Array.isArray(value.items) ||
      value.items.length > HISTORY_LIMIT
    )
      return { available: true, records: [] };
    const records: TournamentTransfer[] = [];
    for (const item of value.items) {
      if (!isJsonObject(item)) return { available: true, records: [] };
      const record = decodeTournamentTransfer(JSON.stringify(item));
      if (!record?.tournament || record.tournament.phase !== 'complete' || record.game !== null)
        return { available: true, records: [] };
      records.push(record);
    }
    return { available: true, records: records.slice(0, HISTORY_LIMIT) };
  } catch {
    return { available: false, records: [] };
  }
}

export function writeTournamentHistory(
  store: TournamentStore | null,
  records: readonly TournamentTransfer[],
): boolean {
  if (!store) return false;
  try {
    const items: Record<string, unknown>[] = [];
    for (const record of records.slice(0, HISTORY_LIMIT)) {
      const text = encodeTournamentTransfer(record.setup, record.tournament, null);
      const value: unknown = text ? parseJson(text) : undefined;
      if (!isJsonObject(value)) return false;
      items.push(value);
    }
    store.setItem(HISTORY_KEY, JSON.stringify({ v: HISTORY_VERSION, items }));
    return true;
  } catch {
    return false;
  }
}
