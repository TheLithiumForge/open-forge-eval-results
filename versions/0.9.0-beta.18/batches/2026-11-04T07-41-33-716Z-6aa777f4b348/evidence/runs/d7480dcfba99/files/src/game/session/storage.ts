import { isSize } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { MAX_MOVES } from '../state.ts';
import { integer, object } from '../snapshotValidation.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export type Preferences = Readonly<{ size: Size; best: Readonly<Partial<Record<Size, number>>> }>;
export type PreferenceStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };

export function readPreferences(storage: PreferenceStorage | null): Preferences {
  const fallback: Preferences = { size: 4, best: {} };
  try {
    const raw = storage?.getItem(PREFERENCES_KEY);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    if (!object(value)) return fallback;
    const best: Partial<Record<Size, number>> = {};
    if (object(value.best)) {
      for (const [key, score] of Object.entries(value.best)) {
        const size = Number(key);
        if (isSize(size) && key === String(size) && integer(score, MAX_MOVES)) best[size] = score;
      }
    }
    return { size: isSize(value.size) ? value.size : 4, best };
  } catch { return fallback; }
}

export function writePreferences(storage: PreferenceStorage | null, preferences: Preferences): void {
  try { storage?.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Play stays available. */ }
}
