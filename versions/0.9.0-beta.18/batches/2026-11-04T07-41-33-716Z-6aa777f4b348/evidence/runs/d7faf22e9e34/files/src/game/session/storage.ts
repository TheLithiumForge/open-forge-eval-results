import { isSupportedSize, SIZES } from '../boardCode.ts';
import type { SupportedSize } from '../boardCode.ts';
import { isRecord, isNonnegativeInteger } from '../formatValidation.ts';
import { MOVE_CAP } from '../transitions.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export interface Preferences {
  readonly size: SupportedSize;
  readonly bests: Readonly<Partial<Record<SupportedSize, number>>>;
}
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
type StorageAccess = () => PreferenceStorage | null;
const defaults = (): Preferences => ({ size: 4, bests: {} });

function browserStorage(): PreferenceStorage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function readPreferences(access: StorageAccess = browserStorage): Preferences {
  try {
    const text = access()?.getItem(PREFERENCES_KEY);
    if (!text) return defaults();
    const value: unknown = JSON.parse(text);
    if (!isRecord(value) || value.version !== 1) return defaults();
    const bests: Partial<Record<SupportedSize, number>> = {};
    if (isRecord(value.bests)) {
      for (const size of SIZES) {
        const score = value.bests[String(size)];
        if (isNonnegativeInteger(score) && score <= MOVE_CAP) bests[size] = score;
      }
    }
    return { size: isSupportedSize(value.size) ? value.size : 4, bests };
  } catch { return defaults(); }
}

export function writePreferences(preferences: Preferences, access: StorageAccess = browserStorage): void {
  try { access()?.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, ...preferences })); }
  catch { /* Storage may be blocked or full; the in-memory session remains usable. */ }
}

export function recordBest(preferences: Preferences, size: SupportedSize, moves: number): Preferences {
  const best = preferences.bests[size];
  return best === undefined || moves < best
    ? { ...preferences, bests: { ...preferences.bests, [size]: moves } } : preferences;
}
