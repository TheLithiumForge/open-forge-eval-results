import { MOVE_CAP } from '../activate-card.ts';
import { isGridSize, SUPPORTED_SIZES } from '../board-code.ts';
import type { GridSize } from '../board-code.ts';
import { isNonnegativeInteger, isRecord } from '../json-input.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export type BestScores = Readonly<Partial<Record<GridSize, number>>>;
export interface Preferences {
  readonly size: GridSize;
  readonly bests: BestScores;
}
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultPreferences(): Preferences {
  return { size: 4, bests: {} };
}

export function decodePreferences(text: string): Preferences {
  try {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value)) return defaultPreferences();
    const bests: Partial<Record<GridSize, number>> = {};
    if (isRecord(value.bests)) {
      for (const size of SUPPORTED_SIZES) {
        const score = value.bests[String(size)];
        if (isNonnegativeInteger(score) && score <= MOVE_CAP) bests[size] = score;
      }
    }
    return { size: isGridSize(value.size) ? value.size : 4, bests };
  } catch {
    return defaultPreferences();
  }
}

export function readPreferences(storage?: PreferenceStorage): Preferences {
  try {
    const source = storage ?? window.localStorage;
    const text = source.getItem(PREFERENCES_KEY);
    return text === null ? defaultPreferences() : decodePreferences(text);
  } catch {
    return defaultPreferences();
  }
}

export function writePreferences(preferences: Preferences, storage?: PreferenceStorage): void {
  try {
    const target = storage ?? window.localStorage;
    target.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Storage is optional. The session's in-memory preferences remain usable.
  }
}

export function rememberBest(preferences: Preferences, size: GridSize, moves: number): Preferences {
  const previous = preferences.bests[size];
  if (!isNonnegativeInteger(moves) || moves > MOVE_CAP || (previous !== undefined && moves >= previous)) {
    return preferences;
  }
  return { ...preferences, bests: { ...preferences.bests, [size]: moves } };
}
