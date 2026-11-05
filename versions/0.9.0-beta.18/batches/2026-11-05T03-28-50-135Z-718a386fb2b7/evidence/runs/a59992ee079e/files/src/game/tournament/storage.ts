import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { decodeTournamentRecord } from './validate.ts';
import type { TournamentReadResult } from './validate.ts';
import type { Tournament } from './model.ts';

const TOURNAMENTS_KEY = 'np3:tournaments';
const TOURNAMENTS_VERSION = 3;
const TOURNAMENTS_LIMIT = 10;

interface TournamentStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface TournamentHistoryRead {
  readonly available: boolean;
  readonly tournaments: readonly Tournament[];
}

export function prependFinishedTournament(
  tournament: Tournament,
  history: readonly Tournament[],
): readonly Tournament[] {
  return [tournament, ...history.filter((item) => item.id !== tournament.id)].slice(
    0,
    TOURNAMENTS_LIMIT,
  );
}

export function browserTournamentStore(): TournamentStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readTournamentHistory(store: TournamentStore | null): TournamentHistoryRead {
  if (!store) return { available: false, tournaments: [] };
  let text: string | null;
  try {
    text = store.getItem(TOURNAMENTS_KEY);
  } catch {
    return { available: false, tournaments: [] };
  }
  if (!text) return { available: true, tournaments: [] };
  if (!isWithinBytes(text, 65_536)) return { available: true, tournaments: [] };
  const value = parseJson(text);
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['items', 'v']) ||
    value.v !== TOURNAMENTS_VERSION ||
    !Array.isArray(value.items) ||
    value.items.length > TOURNAMENTS_LIMIT
  )
    return { available: true, tournaments: [] };
  const tournaments: Tournament[] = [];
  for (const item of value.items) {
    const result: TournamentReadResult = decodeTournamentRecord(item);
    if (!result.tournament || result.tournament.status !== 'finished')
      return { available: true, tournaments: [] };
    tournaments.push(result.tournament);
  }
  return { available: true, tournaments };
}

export function writeTournamentHistory(
  store: TournamentStore | null,
  tournaments: readonly Tournament[],
): boolean {
  if (!store) return false;
  try {
    store.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({ items: tournaments.slice(0, TOURNAMENTS_LIMIT), v: TOURNAMENTS_VERSION }),
    );
    return true;
  } catch {
    return false;
  }
}
