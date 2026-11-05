import { parseJson } from '../saved-format.ts';
import { matchWinner } from './rules.ts';
import { readTournamentRecord, tournamentFields } from './validation.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { TournamentRecord } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';

export function readTournaments(store: PreferenceStore | null) {
  let text: string | null;
  try {
    if (!store) return { items: [], unavailable: true };
    text = store.getItem(TOURNAMENTS_KEY);
  } catch {
    return { items: [], unavailable: true };
  }
  try {
    if (!text) return { items: [], unavailable: false };
    const value = tournamentFields(parseJson(text), ['v', 'items']);
    if (value.v !== 3 || !Array.isArray(value.items)) throw new Error('Invalid saved tournaments.');
    const items = value.items.map((item: unknown) => readTournamentRecord(item));
    if (items.some((item) => matchWinner(item, item.matches.length - 1) === null))
      throw new Error('Unfinished saved tournament.');
    return { items: items.slice(0, 10), unavailable: false };
  } catch {
    return { items: [], unavailable: false };
  }
}

export function retainTournament(
  items: readonly TournamentRecord[],
  event: TournamentRecord,
): TournamentRecord[] {
  const identity = JSON.stringify(event);
  return [event, ...items.filter((item) => JSON.stringify(item) !== identity)].slice(0, 10);
}

export function writeTournaments(
  store: PreferenceStore | null,
  items: readonly TournamentRecord[],
) {
  try {
    if (!store) return false;
    store.setItem(TOURNAMENTS_KEY, JSON.stringify({ v: 3, items: items.slice(0, 10) }));
    return true;
  } catch {
    return false;
  }
}
