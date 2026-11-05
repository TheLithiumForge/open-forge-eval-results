import { isJsonObject, parseJson } from './saved-format.ts';
import { decodeTournament } from './tournament.ts';
import type { PreferenceStore } from './session/storage.ts';
import type { Tournament } from './tournament.ts';

export const TOURNAMENTS_KEY = 'neon-pairs.tournaments.v1';
const TOURNAMENTS_VERSION = 1;

export interface TournamentStore {
  readonly active: Tournament | null;
  readonly past: readonly Tournament[];
}

export const EMPTY_TOURNAMENT_STORE: TournamentStore = { active: null, past: [] };

export function readTournamentStore(store: PreferenceStore | null): TournamentStore {
  try {
    const text = store?.getItem(TOURNAMENTS_KEY);
    if (!text) return EMPTY_TOURNAMENT_STORE;
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      value.schemaVersion !== TOURNAMENTS_VERSION ||
      !(value.active === null || isJsonObject(value.active)) ||
      !Array.isArray(value.past)
    )
      return EMPTY_TOURNAMENT_STORE;
    const active = value.active === null ? null : decodeTournament(value.active);
    const past = value.past.map(decodeTournament);
    if (
      (value.active !== null && (!active || active.phase !== 'active')) ||
      past.some((tournament) => !tournament || tournament.phase !== 'complete')
    )
      return EMPTY_TOURNAMENT_STORE;
    return { active, past: past as Tournament[] };
  } catch {
    return EMPTY_TOURNAMENT_STORE;
  }
}

export function writeTournamentStore(
  store: PreferenceStore | null,
  tournaments: TournamentStore,
): void {
  try {
    store?.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({ schemaVersion: TOURNAMENTS_VERSION, ...tournaments }),
    );
  } catch {
    // A blocked browser store doesn't stop the current tournament.
  }
}
