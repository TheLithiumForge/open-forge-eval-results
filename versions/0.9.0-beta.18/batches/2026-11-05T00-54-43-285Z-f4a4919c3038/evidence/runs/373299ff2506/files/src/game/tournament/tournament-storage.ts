import { isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { TOURNAMENT_JSON_MAX } from './tournament-document.ts';
import { readTournament, serializedTournament } from './tournament-format.ts';
import type { Tournament } from './tournament.ts';
import type { PreferenceStore } from '../session/storage.ts';

export const TOURNAMENTS_KEY = 'neon-pairs.tournaments.v1';

export function readPastTournaments(store: PreferenceStore | null): readonly Tournament[] {
  try {
    const text = store?.getItem(TOURNAMENTS_KEY);
    const value = text && isWithinBytes(text, TOURNAMENT_JSON_MAX) ? parseJson(text) : undefined;
    if (!isJsonObject(value) || value.version !== 1 || !Array.isArray(value.tournaments)) return [];
    const tournaments: Tournament[] = [];
    for (const item of value.tournaments) {
      const tournament = readTournament(item);
      if (
        !tournament ||
        tournament.stage !== 'complete' ||
        tournaments.some(({ id }) => id === tournament.id)
      )
        return [];
      tournaments.push(tournament);
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
    store?.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({ version: 1, tournaments: tournaments.map(serializedTournament) }),
    );
  } catch {
    // A blocked store still allows play and JSON exports.
  }
}
