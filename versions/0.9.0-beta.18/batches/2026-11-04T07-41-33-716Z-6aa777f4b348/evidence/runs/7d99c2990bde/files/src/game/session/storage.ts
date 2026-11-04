import { isBoardSize } from '../boardCode.ts';
import type { BoardSize } from '../boardCode.ts';
import { hasExactKeys, isObject, isSafeInteger } from '../json.ts';
import { MAX_MOVES } from '../state.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export interface Preferences {
  readonly size: BoardSize;
  readonly best: Readonly<Partial<Record<BoardSize, number>>>;
}
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): PreferenceStorage | null {
  try { return window.localStorage; } catch { return null; }
}

export function readPreferences(storage = browserStorage()): Preferences {
  const fallback: Preferences = { size: 4, best: {} };
  try {
    const text = storage?.getItem(PREFERENCES_KEY);
    if (!text) return fallback;
    const value: unknown = JSON.parse(text);
    if (!isObject(value) || !hasExactKeys(value, ['version', 'size', 'best']) ||
        value.version !== 1 || !isBoardSize(value.size) || !isObject(value.best)) return fallback;
    const best: Partial<Record<BoardSize, number>> = {};
    for (const [key, score] of Object.entries(value.best)) {
      const size = Number(key);
      if (!isBoardSize(size) || String(size) !== key || !isSafeInteger(score, MAX_MOVES)) return fallback;
      best[size] = score;
    }
    return { size: value.size, best };
  } catch { return fallback; }
}

export function savePreferences(preferences: Preferences, storage = browserStorage()): void {
  try { storage?.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, ...preferences })); }
  catch { /* Storage failure does not stop this session. */ }
}
