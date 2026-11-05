import { isJsonObject } from '../saved-format.ts';
import { decodeExchange } from './decode.ts';
import type { TournamentState } from './tournament.ts';
const key = 'np3:tournaments';
export function readHistory(): { items: TournamentState[]; failed: boolean } {
  try {
    const text = localStorage.getItem(key);
    if (!text) return { items: [], failed: false };
    const value: unknown = JSON.parse(text);
    if (
      !isJsonObject(value) ||
      Object.keys(value).length !== 2 ||
      value.v !== 3 ||
      !Array.isArray(value.items) ||
      value.items.length > 10
    )
      return { items: [], failed: false };
    const items: TournamentState[] = [];
    for (const item of value.items) {
      const result = decodeExchange(
        JSON.stringify({
          format: 'neon-pairs/tournament',
          version: 1,
          tournament: item,
          snapshot: null,
        }),
      );
      if (!result.value?.tournament || result.value.tournament.phase !== 'complete')
        return { items: [], failed: false };
      items.push(result.value.tournament);
    }
    return { items, failed: false };
  } catch (error) {
    return { items: [], failed: !(error instanceof SyntaxError) };
  }
}
export function writeHistory(items: TournamentState[]): { saved: boolean } {
  try {
    localStorage.setItem(key, JSON.stringify({ v: 3, items }));
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
