import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { MOVE_CAP } from '../state.ts';
import { isInteger, isRecord } from '../validation.ts';

export const STORAGE_KEY = 'neon-pairs.preferences.v1';
export type BestScores = Partial<Record<Size, number>>;
export type Preferences = { size: Size; bests: BestScores };

export function readPreferences(): Preferences {
  const preferences: Preferences = { size: 4, bests: {} };
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    const value: unknown = text ? JSON.parse(text) : null;
    if (!isRecord(value)) return preferences;
    if (isSize(value.size)) preferences.size = value.size;
    if (isRecord(value.bests)) {
      for (const size of SIZES) {
        const score = value.bests[String(size)];
        if (isInteger(score, MOVE_CAP)) preferences.bests[size] = score;
      }
    }
  } catch { /* Storage is optional, including reads and parsing. */ }
  return preferences;
}

export function writePreferences(preferences: Preferences): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); }
  catch { /* The in-memory session remains playable. */ }
}
