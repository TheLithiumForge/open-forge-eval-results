import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import type { PreferenceStore } from '../session/storage.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import { isTournamentComplete } from './rules.ts';
import type { Tournament } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
export const TOURNAMENT_HISTORY_LIMIT = 10;

export function readTournaments(store: PreferenceStore | null): {
  items: readonly Tournament[];
  blocked: boolean;
} {
  try {
    if (!store) return { items: [], blocked: true };
    const text = store.getItem(TOURNAMENTS_KEY);
    if (!text) return { items: [], blocked: false };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['v', 'items']) ||
      value.v !== 3 ||
      !Array.isArray(value.items)
    )
      return { items: [], blocked: false };
    const items: Tournament[] = [];
    for (const item of value.items) {
      const decoded = decodeTournament(JSON.stringify(item));
      if (!decoded.state || !('deals' in decoded.state) || !isTournamentComplete(decoded.state))
        return { items: [], blocked: false };
      items.push(decoded.state);
    }
    return { items, blocked: false };
  } catch {
    return { items: [], blocked: true };
  }
}

export function saveTournaments(store: PreferenceStore | null, items: readonly Tournament[]) {
  try {
    if (!store) return false;
    store.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({
        v: 3,
        items: items
          .slice(0, TOURNAMENT_HISTORY_LIMIT)
          .map((item) => parseJson(encodeTournament(item))),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
