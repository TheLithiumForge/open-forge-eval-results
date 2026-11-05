import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import { TournamentPhase } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const RETAINED_TOURNAMENTS = 10;

export function readTournaments(store: PreferenceStore | null): {
  items: readonly Tournament[];
  available: boolean;
} {
  try {
    if (!store) return { items: [], available: false };
    const text = store.getItem(TOURNAMENTS_KEY);
    if (!text) return { items: [], available: true };
    const value = parseJson(text);
    const empty = { items: [], available: true };
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['v', 'items']) ||
      value.v !== 3 ||
      !Array.isArray(value.items) ||
      value.items.length > RETAINED_TOURNAMENTS
    )
      return empty;
    const items: Tournament[] = [];
    for (const item of value.items) {
      const decoded = decodeTournament(JSON.stringify(item));
      if (!decoded.data?.tournament || decoded.data.tournament.phase !== TournamentPhase.complete)
        return empty;
      items.push(decoded.data.tournament);
    }
    return { items, available: true };
  } catch {
    return { items: [], available: false };
  }
}

export function retainTournament(
  items: readonly Tournament[],
  tournament: Tournament,
): readonly Tournament[] {
  const text = encodeTournament(tournament, tournament.players, null);
  return [
    tournament,
    ...items.filter((item) => encodeTournament(item, item.players, null) !== text),
  ].slice(0, RETAINED_TOURNAMENTS);
}

export function writeTournaments(
  store: PreferenceStore | null,
  items: readonly Tournament[],
): { available: boolean } {
  try {
    if (!store) return { available: false };
    store.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({
        items: items.map((item) => parseJson(encodeTournament(item, item.players, null))),
        v: 3,
      }),
    );
    return { available: true };
  } catch {
    return { available: false };
  }
}
