import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { isValidTournament } from './tournament-validation.ts';
import type { Tournament } from './tournament.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
export const TOURNAMENTS_ENVELOPE_VERSION = 3;
export const TOURNAMENT_HISTORY_LIMIT = 10;

export interface TournamentStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface TournamentHistoryRead {
  readonly available: boolean;
  readonly items: readonly Tournament[];
}

export function browserTournamentStore(): TournamentStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readTournamentHistory(store: TournamentStore | null): TournamentHistoryRead {
  if (!store) return { available: false, items: [] };
  try {
    const text = store.getItem(TOURNAMENTS_KEY);
    if (text === null) return { available: true, items: [] };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['items', 'v']) ||
      value.v !== TOURNAMENTS_ENVELOPE_VERSION ||
      !Array.isArray(value.items) ||
      value.items.length > TOURNAMENT_HISTORY_LIMIT
    )
      return { available: true, items: [] };
    const items: Tournament[] = [];
    for (const item of value.items) {
      if (!isValidTournament(item) || item.status !== 'complete')
        return { available: true, items: [] };
      items.push(item);
    }
    return { available: true, items };
  } catch {
    return { available: false, items: [] };
  }
}

export function writeTournamentHistory(
  store: TournamentStore | null,
  items: readonly Tournament[],
): boolean {
  if (!store) return false;
  try {
    const accepted = items.slice(0, TOURNAMENT_HISTORY_LIMIT);
    if (!accepted.every((item) => item.status === 'complete' && isValidTournament(item))) return false;
    store.setItem(TOURNAMENTS_KEY, JSON.stringify({ items: accepted, v: TOURNAMENTS_ENVELOPE_VERSION }));
    return true;
  } catch {
    return false;
  }
}
