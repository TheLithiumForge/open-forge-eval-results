import { isGridSize, SUPPORTED_SIZES } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import { isRecord } from '../jsonInput.ts';
import { MAX_MOVES } from '../state.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export interface Preferences {
  readonly size: GridSize;
  readonly best: Readonly<Partial<Record<GridSize, number>>>;
}
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type StorageProvider = () => PreferenceStorage;

export function readPreferences(storage: StorageProvider): Preferences {
  const fallback: Preferences = { size: 4, best: {} };
  try {
    const text = storage().getItem(PREFERENCES_KEY);
    if (text === null) return fallback;
    const value: unknown = JSON.parse(text);
    if (!isRecord(value)) return fallback;
    const best: Partial<Record<GridSize, number>> = {};
    if (isRecord(value.best)) {
      for (const size of SUPPORTED_SIZES) {
        const score = value.best[String(size)];
        if (typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= MAX_MOVES) {
          best[size] = score;
        }
      }
    }
    return { size: isGridSize(value.size) ? value.size : 4, best };
  } catch {
    return fallback;
  }
}

export function writePreferences(storage: StorageProvider, preferences: Preferences): void {
  try { storage().setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Play continues in memory. */ }
}

export function keepBest(preferences: Preferences, size: GridSize, moves: number): Preferences {
  const current = preferences.best[size];
  if (current !== undefined && current <= moves) return preferences;
  return { ...preferences, best: { ...preferences.best, [size]: moves } };
}
