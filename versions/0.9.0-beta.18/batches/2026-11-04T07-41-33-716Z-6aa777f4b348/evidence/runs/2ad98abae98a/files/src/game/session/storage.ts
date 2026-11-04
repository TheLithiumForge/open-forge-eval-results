import { isSize, sizes } from '../model.ts';
import type { Size } from '../model.ts';
import { MAX_MOVES } from '../transitions.ts';
import { integer, isObject } from '../validation.ts';

export const STORAGE_KEY = 'neon-pairs.preferences.v1';
export interface Preferences { size: Size; bests: Partial<Record<Size, number>> }

export function readPreferences(): Preferences {
  const fallback: Preferences = { size: 4, bests: {} };
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!isObject(value)) return fallback;
    const bests: Partial<Record<Size, number>> = {};
    if (isObject(value.bests)) {
      for (const size of sizes) {
        const best = value.bests[String(size)];
        if (integer(best, MAX_MOVES)) bests[size] = best;
      }
    }
    return { size: isSize(value.size) ? value.size : 4, bests };
  } catch { return fallback; }
}
export function savePreferences(preferences: Preferences): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Session stays playable. */ }
}
