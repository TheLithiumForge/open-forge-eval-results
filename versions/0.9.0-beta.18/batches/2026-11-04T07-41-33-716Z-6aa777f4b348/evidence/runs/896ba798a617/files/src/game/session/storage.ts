import { MAX_MOVES } from '../activateCard.ts';
import { isBoardSize, SUPPORTED_SIZES } from '../boardCode.ts';
import type { BoardSize } from '../boardCode.ts';
import { isRecord, isSafeInteger } from '../formatInput.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export type BestScores = Readonly<Partial<Record<BoardSize, number>>>;
export type Preferences = Readonly<{ size: BoardSize; best: BestScores }>;
export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): PreferenceStorage | null {
  try { return window.localStorage; } catch { return null; }
}

export function readPreferences(storage = browserStorage()): Preferences {
  const fallback: Preferences = { size: 4, best: {} };
  try {
    const text = storage?.getItem(PREFERENCES_KEY);
    if (!text) return fallback;
    const value: unknown = JSON.parse(text);
    if (!isRecord(value)) return fallback;
    const best: Partial<Record<BoardSize, number>> = {};
    if (isRecord(value.best)) {
      for (const size of SUPPORTED_SIZES) {
        const score = value.best[String(size)];
        if (isSafeInteger(score, MAX_MOVES)) best[size] = score;
      }
    }
    return { size: isBoardSize(value.size) ? value.size : 4, best };
  } catch { return fallback; }
}

export function writePreferences(value: Preferences, storage = browserStorage()): void {
  try { storage?.setItem(PREFERENCES_KEY, JSON.stringify(value)); } catch { /* Play stays in memory. */ }
}
