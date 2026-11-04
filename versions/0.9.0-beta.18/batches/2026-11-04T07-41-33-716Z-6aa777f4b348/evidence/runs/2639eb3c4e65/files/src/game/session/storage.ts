import { isGridSize, SIZES } from '../deck.ts';
import type { GridSize } from '../deck.ts';
import { MAX_MOVES } from '../model.ts';
import { isInteger, isRecord } from '../validation.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export type Preferences = Readonly<{ size: GridSize; best: Partial<Record<GridSize, number>> }>;

export function readPreferences(): Preferences {
  const fallback: Preferences = { size: 4, best: {} };
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    const value: unknown = raw === null ? null : JSON.parse(raw);
    if (!isRecord(value)) return fallback;
    const best: Partial<Record<GridSize, number>> = {};
    if (isRecord(value.best)) {
      for (const size of SIZES) {
        const score = value.best[String(size)];
        if (isInteger(score, MAX_MOVES)) best[size] = score;
      }
    }
    return { size: isGridSize(value.size) ? value.size : 4, best };
  } catch { return fallback; }
}

export function savePreferences(preferences: Preferences): void {
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Session remains playable. */ }
}
