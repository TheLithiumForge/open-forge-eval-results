import { isJsonObject, parseJson } from '../saved-format.ts';
import { validateTournamentState } from './validate-state.ts';
import type { TournamentState } from './types.ts';

const TOURNAMENTS_KEY = 'np3:tournaments';
const TOURNAMENT_RETENTION = 10;
export interface TournamentStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readTournaments(store: TournamentStore | null): {
  readonly items: readonly TournamentState[];
  readonly available: boolean;
} {
  if (!store) return { items: [], available: false };
  try {
    const text = store.getItem(TOURNAMENTS_KEY);
    if (!text) return { items: [], available: true };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      Object.keys(value).length !== 2 ||
      value.v !== 3 ||
      !Array.isArray(value.items)
    )
      return { items: [], available: true };
    const items: TournamentState[] = [];
    for (const item of value.items) {
      const result = validateTournamentState(item);
      if (!('state' in result) || result.state.phase !== 'complete')
        return { items: [], available: true };
      items.push(result.state);
    }
    return { items: retainTournaments(items), available: true };
  } catch {
    return { items: [], available: false };
  }
}

export function writeTournaments(
  store: TournamentStore | null,
  items: readonly TournamentState[],
): { readonly success: boolean } {
  if (!store) return { success: false };
  try {
    store.setItem(TOURNAMENTS_KEY, JSON.stringify({ v: 3, items: retainTournaments(items) }));
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function retainTournaments(items: readonly TournamentState[]): TournamentState[] {
  const unique = new Map(items.map((item) => [eventKey(item), item]));
  return [...unique.values()]
    .sort((first, second) => (second.completedAt ?? '').localeCompare(first.completedAt ?? ''))
    .slice(0, TOURNAMENT_RETENTION);
}

function eventKey(value: unknown): string {
  return JSON.stringify(sortKeys(value)) ?? '';
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => [key, sortKeys(entry)]),
  );
}
