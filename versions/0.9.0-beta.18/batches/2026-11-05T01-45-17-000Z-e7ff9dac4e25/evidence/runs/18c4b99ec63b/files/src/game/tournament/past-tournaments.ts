import { isJsonObject, parseJson } from '../saved-format.ts';
import { readTournament, savedTournament } from './tournament-format.ts';
import { isFinished } from './tournament.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './tournament.ts';

export const PAST_TOURNAMENTS_KEY = 'neon-pairs.tournaments.v1';
export const PAST_TOURNAMENTS_VERSION = 1;
export const PAST_TOURNAMENTS_MAX = 20;

// Only finished tournaments are kept. An entry that no longer reads as one is dropped alone.
export function readPastTournaments(store: PreferenceStore | null): readonly Tournament[] {
  try {
    const text = store?.getItem(PAST_TOURNAMENTS_KEY);
    const value = text ? parseJson(text) : undefined;
    if (
      !isJsonObject(value) ||
      value.schemaVersion !== PAST_TOURNAMENTS_VERSION ||
      !Array.isArray(value.tournaments)
    )
      return [];
    return value.tournaments
      .flatMap((item) => {
        const tournament = readTournament(item);
        return tournament && isFinished(tournament) ? [tournament] : [];
      })
      .slice(0, PAST_TOURNAMENTS_MAX);
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
      PAST_TOURNAMENTS_KEY,
      JSON.stringify({
        schemaVersion: PAST_TOURNAMENTS_VERSION,
        tournaments: tournaments.map(savedTournament),
      }),
    );
  } catch {
    // A blocked browser store doesn't stop the tournament on screen.
  }
}

// The newest tournament comes first. One that is already listed keeps its place.
export function rememberTournament(
  tournaments: readonly Tournament[],
  tournament: Tournament,
): readonly Tournament[] {
  const saved = JSON.stringify(savedTournament(tournament));
  if (tournaments.some((past) => JSON.stringify(savedTournament(past)) === saved))
    return tournaments;
  return [tournament, ...tournaments].slice(0, PAST_TOURNAMENTS_MAX);
}
