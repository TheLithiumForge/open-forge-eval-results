import { isGridSize, supportedSizes } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import { MAX_MOVES } from '../game.ts';
import { hasExactKeys, isNonnegativeInteger, isRecord } from '../validation.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
const PREFERENCES_VERSION = 1;

export interface Preferences {
  readonly size: GridSize;
  readonly bests: Readonly<Partial<Record<GridSize, number>>>;
}

export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaults(): Preferences {
  return { size: 4, bests: {} };
}

function browserStorage(): PreferenceStorage | null {
  try { return window.localStorage; } catch { return null; }
}

export function decodePreferences(text: string): Preferences | null {
  try {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value) || !hasExactKeys(value, ['version', 'size', 'bests'])
      || value.version !== PREFERENCES_VERSION || !isGridSize(value.size)
      || !isRecord(value.bests)) return null;
    const bests: Partial<Record<GridSize, number>> = {};
    if (Object.keys(value.bests).some((key) => !supportedSizes.some((size) => String(size) === key))) return null;
    for (const size of supportedSizes) {
      const score = value.bests[String(size)];
      if (score === undefined) continue;
      if (!isNonnegativeInteger(score) || score > MAX_MOVES) return null;
      bests[size] = score;
    }
    return { size: value.size, bests };
  } catch { return null; }
}

export function readPreferences(storage: PreferenceStorage | null = browserStorage()): Preferences {
  try {
    const text = storage?.getItem(PREFERENCES_KEY);
    return text ? decodePreferences(text) ?? defaults() : defaults();
  } catch { return defaults(); }
}

export function savePreferences(preferences: Preferences, storage: PreferenceStorage | null = browserStorage()): void {
  try {
    storage?.setItem(PREFERENCES_KEY, JSON.stringify({ version: PREFERENCES_VERSION, ...preferences }));
  } catch { /* A failed save leaves the current in-memory session playable. */ }
}

export function recordBest(preferences: Preferences, size: GridSize, moves: number): Preferences {
  const previous = preferences.bests[size];
  return previous !== undefined && moves >= previous
    ? preferences : { ...preferences, bests: { ...preferences.bests, [size]: moves } };
}
