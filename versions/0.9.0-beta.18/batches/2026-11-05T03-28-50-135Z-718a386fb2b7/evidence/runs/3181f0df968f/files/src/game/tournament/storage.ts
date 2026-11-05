import { isJsonObject, parseJson } from '../saved-format.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import { readTournament } from './format.ts';
import type { TournamentData } from './rules.ts';

const KEY = 'np3:tournaments';
export function readHistory(): { items: TournamentData[]; blocked: boolean } {
  try {
    const store = browserStore();
    if (!store) return { items: [], blocked: true };
    const text = store.getItem(KEY);
    if (!text) return { items: [], blocked: false };
    const value = parseJson(text);
    if (
      !isJsonObject(value) ||
      Object.keys(value).sort().join(',') !== 'items,v' ||
      value.v !== 3 ||
      !Array.isArray(value.items) ||
      value.items.length > 10
    )
      return { items: [], blocked: false };
    const items: TournamentData[] = [];
    for (const item of value.items) {
      const parsed = readTournament(item).tournament;
      if (!parsed || parsed.phase !== 'champion') return { items: [], blocked: false };
      items.push(parsed);
    }
    return { items, blocked: false };
  } catch {
    return { items: [], blocked: true };
  }
}
export function saveHistory(items: TournamentData[]): { blocked: boolean } {
  try {
    const store = browserStore();
    if (!store) return { blocked: true };
    store.setItem(KEY, JSON.stringify({ v: 3, items }));
    return { blocked: false };
  } catch {
    return { blocked: true };
  }
}
