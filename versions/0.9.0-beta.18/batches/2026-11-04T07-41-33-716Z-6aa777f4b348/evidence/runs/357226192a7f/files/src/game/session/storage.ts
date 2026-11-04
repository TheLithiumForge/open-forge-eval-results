import { isSize, SIZES } from '../deal.ts';
import type { Size } from '../deal.ts';
import { MAX_MOVES } from '../state.ts';
import { isRecord, nonnegativeInteger } from '../validation.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export type Preferences = Readonly<{ size: Size; bests: Partial<Record<Size, number>> }>;

export function readPreferences(): Preferences {
  const defaults: Preferences = { size: 4, bests: {} };
  try {
    const text = localStorage.getItem(PREFERENCES_KEY);
    if (text === null) return defaults;
    const value: unknown = JSON.parse(text);
    if (!isRecord(value)) return defaults;
    const bests: Partial<Record<Size, number>> = {};
    if (isRecord(value.bests)) {
      for (const size of SIZES) {
        const score = value.bests[String(size)];
        if (nonnegativeInteger(score, MAX_MOVES)) bests[size] = score;
      }
    }
    return { size: isSize(value.size) ? value.size : 4, bests };
  } catch {
    return defaults;
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // The in-memory session remains available when storage is blocked or full.
  }
}
