import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { TournamentPhase } from './rules.ts';
import { readTournament } from './validation.ts';
import type { TournamentState } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const STORAGE_VERSION = 3;
const HISTORY_LIMIT = 10;

export function readTournaments(store: PreferenceStore | null) {
  const empty: readonly TournamentState[] = [];
  if (!store) return { items: empty, blocked: true };
  try {
    const text = store.getItem(TOURNAMENTS_KEY);
    if (!text) return { items: empty, blocked: false };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['v', 'items']) ||
      value.v !== STORAGE_VERSION ||
      !Array.isArray(value.items) ||
      value.items.length > HISTORY_LIMIT
    )
      return { items: empty, blocked: false };
    const items: TournamentState[] = [];
    for (const item of value.items) {
      const tournament = readTournament(item);
      if (!tournament || tournament.phase !== TournamentPhase.completed)
        return { items: empty, blocked: false };
      items.push(tournament);
    }
    return { items, blocked: false };
  } catch {
    return { items: empty, blocked: true };
  }
}

export function saveTournament(
  store: PreferenceStore | null,
  previous: readonly TournamentState[],
  tournament: TournamentState,
) {
  const identity = tournament.matches.map((match) => match.boardCode).join(',');
  const items = [
    tournament,
    ...previous.filter(
      (item) => item.matches.map((match) => match.boardCode).join(',') !== identity,
    ),
  ].slice(0, HISTORY_LIMIT);
  try {
    if (!store) return { items, blocked: true };
    store.setItem(TOURNAMENTS_KEY, JSON.stringify({ v: STORAGE_VERSION, items }));
    return { items, blocked: false };
  } catch {
    return { items, blocked: true };
  }
}
