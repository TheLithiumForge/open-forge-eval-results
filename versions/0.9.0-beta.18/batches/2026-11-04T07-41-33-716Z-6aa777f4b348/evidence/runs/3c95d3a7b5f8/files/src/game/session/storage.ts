import { GRID_SIZES, isGridSize } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import { isRecord } from '../formatInput.ts';
import { MAX_MOVES } from '../state.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export interface Preferences {
  readonly size: GridSize;
  readonly bests: Partial<Record<GridSize, number>>;
}

export function readPreferences(): Preferences {
  const defaults: Preferences = { size: 4, bests: {} };
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY);
    if (saved === null) return defaults;
    const value: unknown = JSON.parse(saved);
    if (!isRecord(value)) return defaults;
    const size = isGridSize(value.size) ? value.size : 4;
    const bests: Partial<Record<GridSize, number>> = {};
    if (isRecord(value.bests)) {
      for (const side of GRID_SIZES) {
        const score = value.bests[String(side)];
        if (typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= MAX_MOVES) {
          bests[side] = score;
        }
      }
    }
    return { size, bests };
  } catch {
    return defaults;
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Storage is optional; the session keeps its validated preferences in memory.
  }
}

export function recordBest(preferences: Preferences, size: GridSize, moves: number): Preferences {
  const best = preferences.bests[size];
  if (best !== undefined && best <= moves) return preferences;
  return { ...preferences, bests: { ...preferences.bests, [size]: moves } };
}
