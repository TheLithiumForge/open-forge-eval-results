import { isSize } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { isRecord, isSafeNonnegative } from '../formatValidation.ts';
import { MAX_MOVES } from '../state.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type BestScores = Readonly<Partial<Record<Size, number>>>;
export interface Preferences { readonly size: Size; readonly bests: BestScores }

export function readPreferences(storage: StoragePort | null): Preferences {
  const fallback: Preferences = { size: 4, bests: {} };
  try {
    const text = storage?.getItem(PREFERENCES_KEY);
    if (!text) return fallback;
    const value: unknown = JSON.parse(text);
    if (!isRecord(value) || !isSize(value.size) || !isRecord(value.bests)) return fallback;
    const bests: Partial<Record<Size, number>> = {};
    for (const [key, score] of Object.entries(value.bests)) {
      const size = Number(key);
      if (!isSize(size) || String(size) !== key || !isSafeNonnegative(score) || score > MAX_MOVES) return fallback;
      bests[size] = score;
    }
    return { size: value.size, bests };
  } catch { return fallback; }
}

export function writePreferences(storage: StoragePort | null, preferences: Preferences): void {
  try { storage?.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Play remains in memory. */ }
}
