import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { MAX_MOVES } from '../state.ts';
import { integerIn, isObject } from '../validation.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export type StoragePort = { getItem(key: string): string | null; setItem(key: string, value: string): void };
export type Preferences = Readonly<{ size: Size; bests: Readonly<Partial<Record<Size, number>>> }>;

export function readPreferences(storage: StoragePort | null): Preferences {
  const defaults: Preferences = { size: 4, bests: {} };
  try {
    const text = storage?.getItem(PREFERENCES_KEY);
    if (!text) return defaults;
    const value: unknown = JSON.parse(text);
    if (!isObject(value)) return defaults;
    const bests: Partial<Record<Size, number>> = {};
    if (isObject(value.bests)) {
      for (const size of SIZES) {
        const score = value.bests[String(size)];
        if (integerIn(score, 0, MAX_MOVES)) bests[size] = score;
      }
    }
    return { size: isSize(value.size) ? value.size : 4, bests };
  } catch { return defaults; }
}

export function savePreferences(storage: StoragePort | null, preferences: Preferences): void {
  try { storage?.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Play remains available. */ }
}
