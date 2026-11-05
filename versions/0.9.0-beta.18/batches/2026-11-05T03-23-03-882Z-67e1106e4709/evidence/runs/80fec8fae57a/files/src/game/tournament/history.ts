import { isJsonObject, hasExactKeys, parseJson } from '../saved-format.ts';
import { encodeTournament, decodeTournament } from './format.ts';
import { TournamentPhase } from './model.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { TournamentState } from './model.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const HISTORY_LIMIT = 10;

export function readTournaments(store: PreferenceStore | null): {
  items: readonly TournamentState[];
  blocked: boolean;
} {
  if (!store) return { items: [], blocked: true };
  try {
    const text = store.getItem(TOURNAMENTS_KEY);
    if (!text) return { items: [], blocked: false };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['v', 'items']) ||
      value.v !== 3 ||
      !Array.isArray(value.items) ||
      value.items.length > HISTORY_LIMIT
    )
      return { items: [], blocked: false };
    const items: TournamentState[] = [];
    for (const item of value.items) {
      const state = decodeTournament(JSON.stringify(item)).document?.tournament;
      if (!state || state.phase !== TournamentPhase.complete) return { items: [], blocked: false };
      items.push(state);
    }
    return { items, blocked: false };
  } catch {
    return { items: [], blocked: true };
  }
}

export function saveTournament(
  store: PreferenceStore | null,
  previous: readonly TournamentState[],
  state: TournamentState,
): { items: readonly TournamentState[]; blocked: boolean } {
  const text = encodeTournament({ setup: null, tournament: state });
  const items = [
    state,
    ...previous.filter((item) => encodeTournament({ setup: null, tournament: item }) !== text),
  ].slice(0, HISTORY_LIMIT);
  try {
    if (!store) return { items, blocked: true };
    store.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({
        v: 3,
        items: items.map((item) => parseJson(encodeTournament({ setup: null, tournament: item }))),
      }),
    );
    return { items, blocked: false };
  } catch {
    return { items, blocked: true };
  }
}
