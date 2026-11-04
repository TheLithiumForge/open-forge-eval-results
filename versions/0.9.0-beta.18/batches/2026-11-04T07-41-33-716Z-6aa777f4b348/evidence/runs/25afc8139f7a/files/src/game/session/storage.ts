import { BOARD_SIZES, isBoardSize } from '../boardCode.ts';
import type { BoardSize } from '../boardCode.ts';
import { MAX_MOVES } from '../transitions.ts';

export const STORAGE_KEY = 'neon-pairs.preferences.v1';
export type Preferences = Readonly<{
  size: BoardSize;
  bests: Readonly<Partial<Record<BoardSize, number>>>;
}>;

const emptyPreferences = (): Preferences => ({ size: 4, bests: {} });

export function readPreferences(): Preferences {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text === null) return emptyPreferences();
    const value: unknown = JSON.parse(text);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return emptyPreferences();
    const size = 'size' in value && isBoardSize(value.size) ? value.size : 4;
    const bests: Partial<Record<BoardSize, number>> = {};
    if ('bests' in value && typeof value.bests === 'object' && value.bests !== null && !Array.isArray(value.bests)) {
      for (const side of BOARD_SIZES) {
        const best: unknown = Reflect.get(value.bests, String(side));
        if (typeof best === 'number' && Number.isSafeInteger(best) && best >= 0 && best <= MAX_MOVES) {
          bests[side] = best;
        }
      }
    }
    return { size, bests };
  } catch {
    return emptyPreferences();
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences are optional; the current session remains playable.
  }
}
