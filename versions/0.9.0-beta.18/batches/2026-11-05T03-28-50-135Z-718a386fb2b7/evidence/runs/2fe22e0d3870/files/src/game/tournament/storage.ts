import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { readTournamentRecord } from './format-record-read.ts';
import type { TournamentRecord } from './model.ts';

const TOURNAMENTS_KEY = 'np3:tournaments';
const TOURNAMENTS_VERSION = 3;
export const TOURNAMENT_RETENTION = 10;

interface TournamentStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function getTournamentStore(): TournamentStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readTournaments(store: TournamentStore | null) {
  try {
    const text = store?.getItem(TOURNAMENTS_KEY);
    if (!text) return { items: [] as readonly TournamentRecord[], available: Boolean(store) };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['items', 'v']) ||
      value.v !== TOURNAMENTS_VERSION ||
      !Array.isArray(value.items)
    )
      return { items: [] as readonly TournamentRecord[], available: Boolean(store) };
    const items = value.items.map(readTournamentRecord);
    if (items.some((item) => item === null))
      return { items: [] as readonly TournamentRecord[], available: Boolean(store) };
    return {
      items: items
        .filter((item): item is TournamentRecord => item !== null)
        .slice(0, TOURNAMENT_RETENTION),
      available: true,
    };
  } catch {
    return { items: [] as readonly TournamentRecord[], available: false };
  }
}

export function writeTournaments(
  store: TournamentStore | null,
  items: readonly TournamentRecord[],
): boolean {
  try {
    store?.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({
        items: items.slice(0, TOURNAMENT_RETENTION),
        v: TOURNAMENTS_VERSION,
      }),
    );
    return store !== null;
  } catch {
    return false;
  }
}
