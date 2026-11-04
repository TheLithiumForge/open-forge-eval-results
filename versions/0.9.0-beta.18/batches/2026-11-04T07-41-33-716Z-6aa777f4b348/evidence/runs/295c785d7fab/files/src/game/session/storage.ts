import { GRID_SIZES, isGridSize } from '../deck.ts';
import type { GridSize } from '../deck.ts';
import { MAX_MOVES } from '../state.ts';
import { isNonnegativeInteger, isRecord } from '../validation.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export type Preferences = Readonly<{ size: GridSize; best: Readonly<Partial<Record<GridSize, number>>> }>;
export type PreferenceStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };

export function parsePreferences(text: string | null): Preferences {
  const best: Partial<Record<GridSize, number>> = {};
  let size: GridSize = 4;
  try {
    const value: unknown = text === null ? null : JSON.parse(text);
    if (isRecord(value)) {
      if (isGridSize(value.size)) size = value.size;
      if (isRecord(value.best)) {
        for (const candidate of GRID_SIZES) {
          const score = value.best[String(candidate)];
          if (isNonnegativeInteger(score, MAX_MOVES)) best[candidate] = score;
        }
      }
    }
  } catch { /* An invalid preference never prevents play. */ }
  return { size, best };
}

export function readPreferences(storage: PreferenceStorage | null): Preferences {
  try { return parsePreferences(storage?.getItem(PREFERENCES_KEY) ?? null); }
  catch { return parsePreferences(null); }
}

export function savePreferences(storage: PreferenceStorage | null, preferences: Preferences): void {
  try { storage?.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Keep playing in memory. */ }
}
