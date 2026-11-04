import { isSize } from '../board.ts';
import type { Size } from '../board.ts';
import { MAX_MOVES } from '../state.ts';
import { integer, isRecord } from '../validation.ts';

export const STORAGE_KEY = 'neon-pairs.preferences.v1';
export type Preferences = Readonly<{ size: Size; best: Readonly<Partial<Record<Size, number>>> }>;

export function readPreferences(): Preferences {
  const fallback: Preferences = { size: 4, best: {} };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!isRecord(raw)) return fallback;
    const best: Partial<Record<Size, number>> = {};
    if (isRecord(raw.best)) {
      for (const [key, value] of Object.entries(raw.best)) {
        const size = Number(key);
        if (String(size) === key && isSize(size) && integer(value, MAX_MOVES)) best[size] = value;
      }
    }
    return { size: isSize(raw.size) ? raw.size : 4, best };
  } catch { return fallback; }
}

export function writePreferences(preferences: Preferences): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Play stays in memory. */ }
}
