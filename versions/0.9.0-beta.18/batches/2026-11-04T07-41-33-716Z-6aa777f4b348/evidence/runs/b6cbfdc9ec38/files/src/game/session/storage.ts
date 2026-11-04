import { isSide, SIDES } from '../boardCode.ts';
import type { Side } from '../boardCode.ts';
import { isRecord } from '../json.ts';
import { MAX_MOVES } from '../state.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export interface Preferences {
  readonly size: Side;
  readonly best: Readonly<Partial<Record<Side, number>>>;
}
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type StorageAccess = () => PreferenceStorage | null;
const browserStorage: StorageAccess = () => globalThis.localStorage;

export function readPreferences(access: StorageAccess = browserStorage): Preferences {
  const defaults: Preferences = { size: 4, best: {} };
  try {
    const text = access()?.getItem(PREFERENCES_KEY);
    if (!text) return defaults;
    const value: unknown = JSON.parse(text);
    if (!isRecord(value) || value.version !== 1) return defaults;
    const best: Partial<Record<Side, number>> = {};
    if (isRecord(value.best)) {
      for (const size of SIDES) {
        const score = value.best[String(size)];
        if (typeof score === 'number' && Number.isSafeInteger(score) && score >= 0
          && score <= MAX_MOVES) best[size] = score;
      }
    }
    return { size: isSide(value.size) ? value.size : 4, best };
  } catch { return defaults; }
}

export function writePreferences(
  preferences: Preferences, access: StorageAccess = browserStorage,
): void {
  try { access()?.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, ...preferences })); }
  catch { /* Saving is optional; the in-memory session remains playable. */ }
}
