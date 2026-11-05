import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import { TournamentPhase } from './rules.ts';
import type { TournamentState } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
export const TOURNAMENT_RETENTION = 10;
export const STORAGE_NOTICE = "Progress won't be saved on this device.";
export interface TournamentHistory {
  readonly items: readonly TournamentState[];
  readonly blocked: boolean;
}

export function readTournaments(store: PreferenceStore | null): TournamentHistory {
  const empty = { items: [], blocked: false };
  if (!store) return { ...empty, blocked: true };
  try {
    const text = store.getItem(TOURNAMENTS_KEY);
    if (!text) return empty;
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['v', 'items']) ||
      value.v !== 3 ||
      !Array.isArray(value.items)
    )
      return empty;
    const items: TournamentState[] = [];
    for (const item of value.items) {
      const { state } = decodeTournament(JSON.stringify(item));
      if (!state || state.phase !== TournamentPhase.complete) return empty;
      items.push(state);
    }
    return { items, blocked: false };
  } catch {
    return { ...empty, blocked: true };
  }
}

export function saveTournament(
  store: PreferenceStore | null,
  history: TournamentHistory,
  tournament: TournamentState,
): TournamentHistory {
  if (tournament.phase !== TournamentPhase.complete) return history;
  const text = encodeTournament(tournament);
  const items = [
    tournament,
    ...history.items.filter((item) => encodeTournament(item) !== text),
  ].slice(0, TOURNAMENT_RETENTION);
  try {
    if (!store) return { items, blocked: true };
    store.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({ v: 3, items: items.map((item) => parseJson(encodeTournament(item))) }),
    );
    return { items, blocked: false };
  } catch {
    return { items, blocked: true };
  }
}
