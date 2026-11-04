import { GAME_LIMITS, supportedSizes, type BoardSize } from "../types.ts";

export const PREFERENCES_KEY = "neon-pairs.preferences.v1";
export type Preferences = Readonly<{
  size: BoardSize;
  bestScores: Partial<Record<BoardSize, number>>;
}>;
type StoragePort = Pick<Storage, "getItem" | "setItem">;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === "number" && supportedSizes.some((size) => size === value);
}

function browserStorage(): StoragePort | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function cleanPreferences(value: unknown): Preferences {
  if (!record(value)) return { size: 4, bestScores: {} };
  const size = isBoardSize(value.size) ? value.size : 4;
  const scores: Partial<Record<BoardSize, number>> = {};
  if (record(value.bestScores)) {
    for (const boardSize of supportedSizes) {
      const score = value.bestScores[boardSize];
      if (typeof score === "number" && Number.isSafeInteger(score) && score >= 0 && score <= GAME_LIMITS.maxMoves) {
        scores[boardSize] = score;
      }
    }
  }
  return { size, bestScores: scores };
}

export function readPreferences(storage: StoragePort | null = browserStorage()): Preferences {
  if (storage === null) return cleanPreferences(null);
  try {
    const value = storage.getItem(PREFERENCES_KEY);
    if (value === null) return cleanPreferences(null);
    try {
      const parsed: unknown = JSON.parse(value);
      return cleanPreferences(parsed);
    } catch {
      return cleanPreferences(null);
    }
  } catch {
    return cleanPreferences(null);
  }
}

export function writePreferences(
  preferences: Preferences,
  storage: StoragePort | null = browserStorage()
): void {
  if (storage === null) return;
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(cleanPreferences(preferences)));
  } catch {
    // Storage is optional; a failed write must not interrupt play.
  }
}
