import { isJsonObject, hasExactKeys, isWithinBytes, parseJson } from '../saved-format.ts';
import { encodeTournament, readTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import { TournamentPhase } from './rules.ts';
import type { TournamentArchive } from './format.ts';
import type { PreferenceStore } from '../session/storage.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
const HISTORY_LIMIT = 10;

export function readTournamentHistory(store: PreferenceStore | null): {
  items: readonly TournamentArchive[];
  available: boolean;
} {
  if (!store) return { items: [], available: false };
  try {
    const text = store.getItem(TOURNAMENTS_KEY);
    const empty = { items: [], available: true };
    if (!text || !isWithinBytes(text, TOURNAMENT_MAX_BYTES * HISTORY_LIMIT)) return empty;
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      !hasExactKeys(value, ['v', 'items']) ||
      value.v !== 3 ||
      !Array.isArray(value.items) ||
      value.items.length > HISTORY_LIMIT
    )
      return empty;
    const items: TournamentArchive[] = [];
    for (const item of value.items) {
      const { archive } = readTournament(JSON.stringify(item));
      if (!archive || archive.tournament?.phase !== TournamentPhase.complete) return empty;
      items.push(archive);
    }
    return { items, available: true };
  } catch {
    return { items: [], available: false };
  }
}

export function saveTournamentHistory(
  store: PreferenceStore | null,
  items: readonly TournamentArchive[],
  archive: TournamentArchive,
): { items: readonly TournamentArchive[]; available: boolean } {
  const text = encodeTournament(archive.tournament, archive.game);
  const next = [
    archive,
    ...items.filter((item) => encodeTournament(item.tournament, item.game) !== text),
  ].slice(0, HISTORY_LIMIT);
  try {
    if (!store) return { items: next, available: false };
    store.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({
        v: 3,
        items: next.map((item) => parseJson(encodeTournament(item.tournament, item.game))),
      }),
    );
    return { items: next, available: true };
  } catch {
    return { items: next, available: false };
  }
}
