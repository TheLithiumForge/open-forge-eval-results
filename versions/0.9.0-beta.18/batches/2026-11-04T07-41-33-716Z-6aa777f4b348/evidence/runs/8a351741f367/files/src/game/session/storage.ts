import { isSize } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { isRecord, nonnegativeInteger } from '../formatValidation.ts';
import { MAX_MOVES } from '../transitions.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export interface Preferences {
  readonly size: Size;
  readonly best: Readonly<Partial<Record<Size, number>>>;
}

export function readPreferences(): Preferences {
  const defaults: Preferences = { size: 4, best: {} };
  try {
    const text = localStorage.getItem(PREFERENCES_KEY);
    if (text === null) return defaults;
    const value: unknown = JSON.parse(text);
    if (!isRecord(value)) return defaults;
    const size = isSize(value.size) ? value.size : 4;
    const best: Partial<Record<Size, number>> = {};
    if (isRecord(value.best)) {
      for (const [key, score] of Object.entries(value.best)) {
        const side = Number(key);
        if (isSize(side) && String(side) === key && nonnegativeInteger(score, MAX_MOVES)) best[side] = score;
      }
    }
    return { size, best };
  } catch {
    return defaults;
  }
}

export function writePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Storage is optional; the in-memory session remains playable.
  }
}

export function recordBest(preferences: Preferences, size: Size, moves: number): Preferences {
  const previous = preferences.best[size];
  if (previous !== undefined && previous <= moves) return preferences;
  const next = { ...preferences, best: { ...preferences.best, [size]: moves } };
  writePreferences(next);
  return next;
}
