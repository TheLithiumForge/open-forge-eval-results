import { BOARD_SIZES, isBoardSize, type BoardSize } from "../boardCode.ts";

const PREFERENCES_KEY = "neon-pairs.preferences.v1";
const BEST_SCORES_KEY = "neon-pairs.best.v1";
const MAX_MOVES = 999_999;

export interface SessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type BestScores = Partial<Record<BoardSize, number>>;

export function browserStorage(): SessionStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readPreferredSize(storage: SessionStorage | null): BoardSize | null {
  try {
    const text = storage?.getItem(PREFERENCES_KEY);
    if (text === null || text === undefined) return null;
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const size: unknown = Reflect.get(value, "size");
    return isBoardSize(size) ? size : null;
  } catch {
    return null;
  }
}

export function readBestScores(storage: SessionStorage | null): BestScores {
  try {
    const text = storage?.getItem(BEST_SCORES_KEY);
    if (text === null || text === undefined) return {};
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    const scores: BestScores = {};
    for (const [key, score] of Object.entries(value)) {
      const size = Number(key);
      if (isBoardSize(size) && validScore(score)) scores[size] = score;
    }
    return scores;
  } catch {
    return {};
  }
}

export function savePreferredSize(storage: SessionStorage | null, size: BoardSize): void {
  try {
    storage?.setItem(PREFERENCES_KEY, JSON.stringify({ size }));
  } catch {
    // An unavailable store never blocks the current game.
  }
}

export function saveBestScores(storage: SessionStorage | null, scores: BestScores): void {
  const valid: Record<string, number> = {};
  for (const size of BOARD_SIZES) {
    const score = scores[size];
    if (score !== undefined && validScore(score)) valid[String(size)] = score;
  }
  try {
    storage?.setItem(BEST_SCORES_KEY, JSON.stringify(valid));
  } catch {
    // Keep the in-memory record even if persistence fails.
  }
}

function validScore(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0 && value <= MAX_MOVES;
}
