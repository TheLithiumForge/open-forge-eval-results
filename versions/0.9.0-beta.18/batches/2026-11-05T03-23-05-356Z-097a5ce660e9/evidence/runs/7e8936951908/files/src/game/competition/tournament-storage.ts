import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { decodeTournament } from './tournament-format.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './tournament.ts';

export const TOURNAMENT_STORAGE_KEY = 'np3:tournaments';
const STORAGE_VERSION = 3;

export interface TournamentHistoryRead {
  readonly tournaments: Tournament[];
  readonly available: boolean;
}

export function readTournamentHistory(store: PreferenceStore | null): TournamentHistoryRead {
  if (!store) return { tournaments: [], available: false };
  try {
    const text = store.getItem(TOURNAMENT_STORAGE_KEY);
    if (!text) return { tournaments: [], available: true };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['v', 'items']) ||
      value.v !== STORAGE_VERSION ||
      !Array.isArray(value.items)
    )
      return { tournaments: [], available: true };
    const tournaments: Tournament[] = [];
    for (const item of value.items) {
      const tournament = decodeTournament(item);
      if (!tournament || tournament.phase !== 'finished')
        return { tournaments: [], available: true };
      tournaments.push(tournament);
    }
    return { tournaments: tournaments.slice(0, 10), available: true };
  } catch {
    return { tournaments: [], available: false };
  }
}

export function writeTournamentHistory(
  store: PreferenceStore | null,
  tournaments: readonly Tournament[],
): boolean {
  try {
    store?.setItem(
      TOURNAMENT_STORAGE_KEY,
      JSON.stringify({ v: STORAGE_VERSION, items: tournaments.slice(0, 10) }),
    );
    return store !== null;
  } catch {
    return false;
  }
}
