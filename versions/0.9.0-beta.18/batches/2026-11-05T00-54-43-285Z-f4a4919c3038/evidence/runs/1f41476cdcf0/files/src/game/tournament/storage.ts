import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { TournamentPhase } from './types.ts';
import { readTournament } from './validation.ts';
import type { Tournament } from './types.ts';
import type { PreferenceStore } from '../session/storage.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
export function readPastTournaments(store: PreferenceStore | null): {
  items: readonly Tournament[];
  blocked: boolean;
} {
  if (!store) return { items: [], blocked: true };
  let text: string | null;
  try {
    text = store.getItem(TOURNAMENTS_KEY);
  } catch {
    return { items: [], blocked: true };
  }
  try {
    if (text === null) return { items: [], blocked: false };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['v', 'items']) ||
      value.v !== 3 ||
      !Array.isArray(value.items) ||
      value.items.length > 10
    )
      return { items: [], blocked: false };
    const items = value.items.map(readTournament);
    if (items.some((item) => item.phase !== TournamentPhase.complete))
      return { items: [], blocked: false };
    return { items, blocked: false };
  } catch {
    return { items: [], blocked: false };
  }
}

export function savePastTournament(
  store: PreferenceStore | null,
  past: readonly Tournament[],
  tournament: Tournament,
): { items: readonly Tournament[]; blocked: boolean } {
  const identity = JSON.stringify(tournament);
  const items = [tournament, ...past.filter((item) => JSON.stringify(item) !== identity)].slice(
    0,
    10,
  );
  try {
    if (!store) return { items, blocked: true };
    store.setItem(TOURNAMENTS_KEY, JSON.stringify({ v: 3, items }));
    return { items, blocked: false };
  } catch {
    return { items, blocked: true };
  }
}
