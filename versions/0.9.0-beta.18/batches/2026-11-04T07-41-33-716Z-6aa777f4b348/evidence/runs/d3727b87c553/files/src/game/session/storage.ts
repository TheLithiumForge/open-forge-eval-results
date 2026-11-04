import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { MAX_MOVES } from '../transitions.ts';
import { isObject } from '../validation.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export interface Preferences {
  readonly size: Size;
  readonly bests: Readonly<Partial<Record<Size, number>>>;
}
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readPreferences(storage: PreferenceStorage): Preferences {
  const fallback: Preferences = { size: 4, bests: {} };
  try {
    const text = storage.getItem(PREFERENCES_KEY);
    if (!text) return fallback;
    const value: unknown = JSON.parse(text);
    if (!isObject(value) || value.version !== 1) return fallback;
    const bests: Partial<Record<Size, number>> = {};
    if (isObject(value.bests)) {
      for (const size of SIZES) {
        const score = value.bests[String(size)];
        if (typeof score === 'number' && Number.isSafeInteger(score) && score >= 0 && score <= MAX_MOVES) bests[size] = score;
      }
    }
    return { size: isSize(value.size) ? value.size : 4, bests };
  } catch {
    return fallback;
  }
}

export function savePreferences(storage: PreferenceStorage, preferences: Preferences): void {
  try { storage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, ...preferences })); } catch { /* Session remains playable. */ }
}

export function browserStorage(): PreferenceStorage {
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  };
}
