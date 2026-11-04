import { isBoardSize } from "../boardCode.ts";
import { MOVE_CAP } from "../transitions.ts";
import { BOARD_SIZES, type BoardSize } from "../types.ts";

export const PREFERENCES_KEY = "neon-pairs.preferences.v1";
export const BEST_SCORES_KEY = "neon-pairs.best.v1";

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
export type BestScores = Partial<Record<BoardSize, number>>;

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readSavedSize(storage = browserStorage()): BoardSize {
  try {
    const value: unknown = JSON.parse(storage?.getItem(PREFERENCES_KEY) ?? "null");
    return record(value) && typeof value.size === "number" && isBoardSize(value.size) ? value.size : 4;
  } catch {
    return 4;
  }
}

export function saveSize(size: BoardSize, storage = browserStorage()): void {
  try {
    storage?.setItem(PREFERENCES_KEY, JSON.stringify({ size }));
  } catch {
    // Storage is optional; keep the current game available.
  }
}

export function readBestScores(storage = browserStorage()): BestScores {
  try {
    const value: unknown = JSON.parse(storage?.getItem(BEST_SCORES_KEY) ?? "null");
    if (!record(value)) return {};
    const scores: BestScores = {};
    for (const [key, score] of Object.entries(value)) {
      const size = Number(key);
      if (String(size) === key && isBoardSize(size) && validScore(score)) scores[size] = score;
    }
    return scores;
  } catch {
    return {};
  }
}

function validScore(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= MOVE_CAP;
}

export function saveBestScores(scores: BestScores, storage = browserStorage()): void {
  try {
    const values: Record<string, number> = {};
    for (const size of BOARD_SIZES) {
      const score = scores[size];
      if (score !== undefined && validScore(score)) values[String(size)] = score;
    }
    storage?.setItem(BEST_SCORES_KEY, JSON.stringify(values));
  } catch {
    // Storage is optional; keep the current game available.
  }
}

export function recordBest(
  scores: BestScores,
  size: BoardSize,
  moves: number,
  storage = browserStorage(),
): BestScores {
  const current = scores[size];
  if (current !== undefined && current <= moves) return scores;
  const updated = { ...scores, [size]: Math.min(MOVE_CAP, moves) };
  saveBestScores(updated, storage);
  return updated;
}
