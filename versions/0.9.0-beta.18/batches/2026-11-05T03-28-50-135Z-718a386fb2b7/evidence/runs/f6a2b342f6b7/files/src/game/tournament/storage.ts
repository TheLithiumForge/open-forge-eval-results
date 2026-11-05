import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { decodeTournamentValue } from './decode.ts';
import { encodeTournament } from './format.ts';
import type { Tournament } from './types.ts';

const TOURNAMENTS_KEY = 'np3:tournaments';
const STORAGE_VERSION = 3;
const MAX_PAST_TOURNAMENTS = 10;
const MAX_STORAGE_BYTES = 262_144;

export interface TournamentStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface PastTournamentRead {
  readonly available: boolean;
  readonly tournaments: readonly Tournament[];
}

export function readPastTournaments(store: TournamentStore | null): PastTournamentRead {
  if (!store) return { available: false, tournaments: [] };
  try {
    const text = store.getItem(TOURNAMENTS_KEY);
    if (!text) return { available: true, tournaments: [] };
    if (!isWithinBytes(text, MAX_STORAGE_BYTES)) return { available: true, tournaments: [] };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['items', 'v']) ||
      value.v !== STORAGE_VERSION ||
      !Array.isArray(value.items)
    )
      return { available: true, tournaments: [] };
    const tournaments: Tournament[] = [];
    for (const item of value.items) {
      const tournament = decodeTournamentValue(item);
      if (!tournament?.champion || tournament.game !== null)
        return { available: true, tournaments: [] };
      tournaments.push(tournament);
    }
    return { available: true, tournaments: tournaments.slice(0, MAX_PAST_TOURNAMENTS) };
  } catch {
    return { available: false, tournaments: [] };
  }
}

export function writePastTournaments(
  store: TournamentStore | null,
  tournaments: readonly Tournament[],
): boolean {
  if (!store) return false;
  try {
    const items = tournaments
      .slice(0, MAX_PAST_TOURNAMENTS)
      .map((tournament) => parseJson(encodeTournament({ ...tournament, game: null })));
    store.setItem(TOURNAMENTS_KEY, JSON.stringify({ items, v: STORAGE_VERSION }));
    return true;
  } catch {
    return false;
  }
}

export function archiveTournament(
  tournaments: readonly Tournament[],
  completed: Tournament,
): Tournament[] {
  const archived = { ...completed, game: null };
  const signature = tournamentSignature(archived);
  return [archived, ...tournaments.filter((item) => tournamentSignature(item) !== signature)].slice(
    0,
    MAX_PAST_TOURNAMENTS,
  );
}

function tournamentSignature(tournament: Tournament): string {
  return encodeTournament({ ...tournament, game: null });
}
