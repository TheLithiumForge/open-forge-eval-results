import { parseJson } from '../saved-format.ts';
import { readTournament, requireShape } from './read-tournament.ts';
import { TournamentPhase } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { TournamentState } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
export function readTournaments(store: PreferenceStore | null) {
  try {
    if (!store) return { items: [], blocked: true };
    const text = store.getItem(TOURNAMENTS_KEY);
    if (!text) return { items: [], blocked: false };
    try {
      const value = requireShape(parseJson(text), ['v', 'items']);
      if (value.v !== 3 || !Array.isArray(value.items) || value.items.length > 10)
        throw new Error('Invalid list.');
      const items = value.items.map((item: unknown) => readTournament(item));
      if (items.some((item) => item.phase !== TournamentPhase.complete))
        throw new Error('Unfinished record.');
      return { items, blocked: false };
    } catch {
      return { items: [], blocked: false };
    }
  } catch {
    return { items: [], blocked: true };
  }
}

export function saveTournaments(store: PreferenceStore | null, items: readonly TournamentState[]) {
  try {
    if (!store) return false;
    store.setItem(TOURNAMENTS_KEY, JSON.stringify({ v: 3, items: items.slice(0, 10) }));
    return true;
  } catch {
    return false;
  }
}
