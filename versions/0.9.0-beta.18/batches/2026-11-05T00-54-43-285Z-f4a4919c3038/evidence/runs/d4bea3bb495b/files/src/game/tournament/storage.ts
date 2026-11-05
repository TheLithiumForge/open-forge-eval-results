import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { encodeTournament, readTournamentDocument } from './format.ts';
import { TournamentPhase } from './model.ts';
import type { TournamentState } from './model.ts';
import type { PreferenceStore } from '../session/storage.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const RETAINED_TOURNAMENTS = 10;

export function readTournaments(store: PreferenceStore | null): {
  items: TournamentState[];
  blocked: boolean;
} {
  try {
    if (!store) return { items: [], blocked: true };
    const value = parseJson(store.getItem(TOURNAMENTS_KEY) ?? 'null');
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['v', 'items']) ||
      value.v !== 3 ||
      !Array.isArray(value.items) ||
      value.items.length > RETAINED_TOURNAMENTS
    )
      return { items: [], blocked: false };
    const items: TournamentState[] = [];
    for (const item of value.items) {
      const tournament = readTournamentDocument(JSON.stringify(item)).document?.tournament;
      if (!tournament || tournament.phase !== TournamentPhase.complete)
        return { items: [], blocked: false };
      items.push(tournament);
    }
    return { items, blocked: false };
  } catch {
    return { items: [], blocked: true };
  }
}

export function retainTournament(
  items: readonly TournamentState[],
  tournament: TournamentState,
): TournamentState[] {
  const text = encodeTournament({ setup: null, tournament });
  return [
    tournament,
    ...items.filter((item) => encodeTournament({ setup: null, tournament: item }) !== text),
  ].slice(0, RETAINED_TOURNAMENTS);
}

export function writeTournaments(
  store: PreferenceStore | null,
  items: readonly TournamentState[],
): { blocked: boolean } {
  try {
    if (!store) return { blocked: true };
    const records = items
      .slice(0, RETAINED_TOURNAMENTS)
      .map((tournament) => parseJson(encodeTournament({ setup: null, tournament })));
    store.setItem(TOURNAMENTS_KEY, JSON.stringify({ v: 3, items: records }));
    return { blocked: false };
  } catch {
    return { blocked: true };
  }
}
