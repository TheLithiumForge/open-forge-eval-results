import { isBoardSize, type BoardSize } from "../board.ts";
import { MAX_MOVES } from "../timing.ts";

export const PREFERENCES_KEY = "neonPairs.preferences.v1";
export const BEST_SCORES_KEY = "neonPairs.bestScores.v1";
const STORAGE_VERSION = 1;

export type SessionStorage = Pick<Storage, "getItem" | "setItem">;
export type BestScores = Readonly<Partial<Record<BoardSize, number>>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(storage: SessionStorage | null, key: string): unknown {
  try {
    const text = storage?.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function browserStorage(): SessionStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readGridSize(storage: SessionStorage | null): BoardSize | null {
  const value = readJson(storage, PREFERENCES_KEY);
  return isRecord(value) && value.version === STORAGE_VERSION && isBoardSize(value.size)
    ? value.size
    : null;
}

export function writeGridSize(storage: SessionStorage | null, size: BoardSize): void {
  try {
    storage?.setItem(PREFERENCES_KEY, JSON.stringify({ version: STORAGE_VERSION, size }));
  } catch {
    // Preferences are optional; storage failures never prevent play.
  }
}

export function readBestScores(storage: SessionStorage | null): BestScores {
  const value = readJson(storage, BEST_SCORES_KEY);
  if (!isRecord(value) || value.version !== STORAGE_VERSION || !isRecord(value.scores)) return {};
  const scores: Partial<Record<BoardSize, number>> = {};
  for (const [key, score] of Object.entries(value.scores)) {
    const size = Number(key);
    if (isBoardSize(size) && Number.isSafeInteger(score) && Number(score) >= 0 && Number(score) <= MAX_MOVES) {
      scores[size] = Number(score);
    }
  }
  return scores;
}

export function readBestScore(storage: SessionStorage | null, size: BoardSize): number | null {
  return readBestScores(storage)[size] ?? null;
}

export function saveBestScore(storage: SessionStorage | null, size: BoardSize, moves: number): number | null {
  if (!Number.isSafeInteger(moves) || moves < 0 || moves > MAX_MOVES) return readBestScore(storage, size);
  const scores = readBestScores(storage);
  const previous = scores[size];
  if (previous !== undefined && previous <= moves) return previous;
  const updated = { ...scores, [size]: moves };
  try {
    storage?.setItem(BEST_SCORES_KEY, JSON.stringify({ version: STORAGE_VERSION, scores: updated }));
  } catch {
    return previous ?? null;
  }
  return moves;
}
