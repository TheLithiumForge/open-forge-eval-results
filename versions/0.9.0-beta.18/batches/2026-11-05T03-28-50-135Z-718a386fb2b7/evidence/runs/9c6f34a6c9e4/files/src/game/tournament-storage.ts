import { hasExactKeys, isJsonObject, parseJson } from './saved-format.ts';
import { isValidTournament } from './tournament-validation.ts';
import type { PreferenceStore } from './session/storage.ts';
import type { Tournament } from './tournament.ts';

const TOURNAMENTS_KEY = 'neon-pairs.tournaments.v1';
const STORAGE_VERSION = 1;

export function readPastTournaments(store: PreferenceStore | null): Tournament[] {
  try {
    const text = store?.getItem(TOURNAMENTS_KEY);
    if (!text) return [];
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['version', 'tournaments']) ||
      value.version !== STORAGE_VERSION ||
      !Array.isArray(value.tournaments)
    )
      return [];
    const tournaments: Tournament[] = [];
    for (const item of value.tournaments) {
      if (!isValidTournament(item) || item.status !== 'complete') return [];
      tournaments.push(item);
    }
    return tournaments;
  } catch {
    return [];
  }
}

export function writePastTournaments(
  store: PreferenceStore | null,
  tournaments: readonly Tournament[],
): void {
  try {
    store?.setItem(TOURNAMENTS_KEY, JSON.stringify({ version: STORAGE_VERSION, tournaments }));
  } catch {
    // An unavailable browser store does not stop the tournament.
  }
}
