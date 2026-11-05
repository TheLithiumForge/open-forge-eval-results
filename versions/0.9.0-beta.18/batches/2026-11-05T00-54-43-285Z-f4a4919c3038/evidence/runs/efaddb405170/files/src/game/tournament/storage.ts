import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import { TournamentPhase } from './rules.ts';
import type { TournamentState } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const RETAINED_TOURNAMENTS = 10;

export function readTournaments(store: PreferenceStore | null): {
  items: readonly TournamentState[];
  blocked: boolean;
} {
  if (!store) return { items: [], blocked: true };
  try {
    const text = store.getItem(TOURNAMENTS_KEY);
    if (text === null) return { items: [], blocked: false };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['v', 'items']) ||
      value.v !== 3 ||
      !Array.isArray(value.items) ||
      value.items.length > RETAINED_TOURNAMENTS
    )
      return { items: [], blocked: false };
    const items: TournamentState[] = [];
    for (const record of value.items) {
      const result = decodeTournament(JSON.stringify(record));
      if (!result.state || result.state.phase !== TournamentPhase.complete)
        return { items: [], blocked: false };
      items.push(result.state);
    }
    return { items, blocked: false };
  } catch {
    return { items: [], blocked: true };
  }
}

export function saveTournament(
  store: PreferenceStore | null,
  history: readonly TournamentState[],
  state: TournamentState,
) {
  const text = encodeTournament(state);
  const items = [state, ...history.filter((item) => encodeTournament(item) !== text)].slice(
    0,
    RETAINED_TOURNAMENTS,
  );
  let blocked = !store;
  try {
    store?.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({ v: 3, items: items.map((item) => parseJson(encodeTournament(item))) }),
    );
  } catch {
    blocked = true;
  }
  return { items, blocked };
}
