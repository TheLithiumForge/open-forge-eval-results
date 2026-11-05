import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { encodeTournament, decodeTournament } from './format.ts';
import { TournamentPhase } from './model.ts';
import type { TournamentState } from './model.ts';
import type { PreferenceStore } from '../session/storage.ts';

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
      const decoded = decodeTournament(JSON.stringify(item));
      if ('error' in decoded || decoded.state.phase !== TournamentPhase.complete)
        return { items: [], blocked: false };
      items.push(decoded.state);
    }
    return { items, blocked: false };
  } catch {
    return { items: [], blocked: true };
  }
}

export function retainTournament(
  items: readonly TournamentState[],
  state: TournamentState,
): readonly TournamentState[] {
  if (state.phase !== TournamentPhase.complete) return items;
  const record = encodeTournament(state);
  return [state, ...items.filter((item) => encodeTournament(item) !== record)].slice(
    0,
    HISTORY_LIMIT,
  );
}

export function writeTournaments(
  store: PreferenceStore | null,
  items: readonly TournamentState[],
): { saved: boolean } {
  if (!store) return { saved: false };
  try {
    store.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({
        v: 3,
        items: items.map((item) => parseJson(encodeTournament(item))),
      }),
    );
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
