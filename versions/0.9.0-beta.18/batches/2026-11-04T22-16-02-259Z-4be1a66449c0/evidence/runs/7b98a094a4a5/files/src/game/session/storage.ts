import { BOARD_SIZES, MOVE_LIMIT, type BoardSize } from "../constants.js";

const SIZE_KEY = "neonPairs.preferences.v1";
const BEST_KEY = "neonPairs.best.v1";

export type BestScores = Partial<Record<BoardSize, number>>;

export function readSavedSize(): BoardSize | null {
  try {
    const raw = window.localStorage.getItem(SIZE_KEY);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1) return null;
    return isBoardSize(value.size) ? value.size : null;
  } catch {
    return null;
  }
}

export function saveSize(size: BoardSize): void {
  try {
    window.localStorage.setItem(SIZE_KEY, JSON.stringify({ version: 1, size }));
  } catch {
    return;
  }
}

export function readBestScores(): BestScores {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    if (raw === null) return {};
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !isRecord(value.scores)) return {};
    const result: BestScores = {};
    for (const size of BOARD_SIZES) {
      const score = value.scores[String(size)];
      if (isScore(score)) result[size] = score;
    }
    return result;
  } catch {
    return {};
  }
}

export function saveBestScores(scores: BestScores): void {
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify({ version: 1, scores }));
  } catch {
    return;
  }
}

function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === "number" && BOARD_SIZES.some((size) => size === value);
}

function isScore(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0 && value <= MOVE_LIMIT;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
