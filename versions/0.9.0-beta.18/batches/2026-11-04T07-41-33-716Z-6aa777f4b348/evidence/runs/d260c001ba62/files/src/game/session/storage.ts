import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { MAX_MOVES } from '../transitions.ts';
import { integer, record } from '../validation.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export interface Preferences { readonly size: Size; readonly bests: Readonly<Partial<Record<Size, number>>> }

export function readPreferences(): Preferences {
  const fallback: Preferences = { size: 4, bests: {} };
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? 'null');
    if (!record(value)) return fallback;
    const bests: Partial<Record<Size, number>> = {};
    if (record(value.bests)) {
      for (const size of SIZES) {
        const score = value.bests[String(size)];
        if (integer(score, MAX_MOVES)) bests[size] = score;
      }
    }
    return { size: isSize(value.size) ? value.size : 4, bests };
  } catch { return fallback; }
}

export function writePreferences(preferences: Preferences): void {
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Play remains in memory. */ }
}
