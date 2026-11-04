import { isSize } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { MAX_MOVES } from '../model.ts';
import { integer, object } from '../validation.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export const BEST_KEY = 'neon-pairs.best.v1';
export type Scores = Partial<Record<Size, number>>;
export interface Preferences { readonly size: Size; readonly scores: Scores }

function read(key: string): unknown {
  try {
    const text = localStorage.getItem(key);
    const value: unknown = text === null ? null : JSON.parse(text);
    return value;
  } catch { return null; }
}

function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Play stays in memory. */ }
}

export function readPreferences(): Preferences {
  const preference = read(PREFERENCES_KEY);
  const saved = read(BEST_KEY);
  const size = object(preference) && isSize(preference.size) ? preference.size : 4;
  const scores: Scores = {};
  if (object(saved)) {
    for (const [key, value] of Object.entries(saved)) {
      const side = Number(key);
      if (isSize(side) && String(side) === key && integer(value, MAX_MOVES)) scores[side] = value;
    }
  }
  return { size, scores };
}

export function saveSize(size: Size): void { write(PREFERENCES_KEY, { size }); }

export function recordBest(scores: Scores, size: Size, moves: number): Scores {
  const best = scores[size];
  if (best !== undefined && best <= moves) return scores;
  const next = { ...scores, [size]: moves };
  write(BEST_KEY, next);
  return next;
}
