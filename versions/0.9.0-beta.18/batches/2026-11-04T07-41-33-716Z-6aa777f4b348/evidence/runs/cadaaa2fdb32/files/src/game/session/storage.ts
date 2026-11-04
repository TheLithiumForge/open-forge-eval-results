import { isSize } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { isInteger, isRecord } from '../formatValidation.ts';
import { MAX_MOVES } from '../rules.ts';

export const STORAGE_KEY = 'neon-pairs.preferences.v1';
export interface Preferences { size: Size; best: Partial<Record<Size, number>> }

export function readPreferences(): Preferences {
  const fallback: Preferences = { size: 4, best: {} };
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    const value: unknown = text === null ? null : JSON.parse(text);
    if (!isRecord(value)) return fallback;
    const best: Preferences['best'] = {};
    if (isRecord(value.best)) {
      for (const [key, score] of Object.entries(value.best)) {
        const size = Number(key);
        if (isSize(size) && key === String(size) && isInteger(score, MAX_MOVES)) best[size] = score;
      }
    }
    return { size: isSize(value.size) ? value.size : 4, best };
  } catch { return fallback; }
}

export function savePreferences(preferences: Preferences): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Play in memory. */ }
}
