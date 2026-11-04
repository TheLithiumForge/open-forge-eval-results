import { isSize, SIZES } from '../board-code.ts';
import type { Size } from '../board-code.ts';
import { MAX_MOVES } from '../state.ts';
import { integer, isObject } from '../validation.ts';

export const STORAGE_KEY = 'neon-pairs.preferences.v1';
export interface Preferences { size: Size; best: Partial<Record<Size, number>> }
export interface PreferenceStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function readPreferences(storage: PreferenceStorage | null): Preferences {
  const preferences: Preferences = { size: 4, best: {} };
  try {
    const text = storage?.getItem(STORAGE_KEY);
    const value: unknown = text ? JSON.parse(text) : null;
    if (!isObject(value)) return preferences;
    if (isSize(value.size)) preferences.size = value.size;
    if (isObject(value.best)) {
      for (const size of SIZES) {
        const score = value.best[String(size)];
        if (integer(score, MAX_MOVES)) preferences.best[size] = score;
      }
    }
  } catch { /* Storage is optional. */ }
  return preferences;
}

export function savePreferences(storage: PreferenceStorage | null, preferences: Preferences): void {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Play remains available. */ }
}

export function browserStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}
