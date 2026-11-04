import { isBoardSize, MAX_MOVES, SUPPORTED_SIZES, type BoardSize } from "../constants";

const SIZE_KEY = "neon-pairs.preference.v1";
const BEST_KEY = "neon-pairs.bests.v1";

export type BestScores = Partial<Record<BoardSize, number>>;

function storageOrNull(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

export function readGridSize(): BoardSize | null {
  try {
    const storage = storageOrNull();
    if (storage === null) return null;
    const value: unknown = JSON.parse(storage.getItem(SIZE_KEY) ?? "null");
    if (typeof value === "object" && value !== null && "size" in value && isBoardSize(value.size)) return value.size;
  } catch { /* Storage is optional. */ }
  return null;
}

export function writeGridSize(size: BoardSize): void {
  try { storageOrNull()?.setItem(SIZE_KEY, JSON.stringify({ size })); } catch { /* Storage is optional. */ }
}

export function readBestScores(): BestScores {
  const scores: BestScores = {};
  try {
    const storage = storageOrNull();
    if (storage === null) return scores;
    const value: unknown = JSON.parse(storage.getItem(BEST_KEY) ?? "null");
    if (typeof value !== "object" || value === null || Array.isArray(value)) return scores;
    for (const size of SUPPORTED_SIZES) {
      const score: unknown = (value as Record<string, unknown>)[String(size)];
      if (typeof score === "number" && Number.isSafeInteger(score) && score >= 0 && score <= MAX_MOVES) scores[size] = score;
    }
  } catch { /* Storage is optional. */ }
  return scores;
}

export function writeBestScores(scores: BestScores): void {
  try { storageOrNull()?.setItem(BEST_KEY, JSON.stringify(scores)); } catch { /* Storage is optional. */ }
}
