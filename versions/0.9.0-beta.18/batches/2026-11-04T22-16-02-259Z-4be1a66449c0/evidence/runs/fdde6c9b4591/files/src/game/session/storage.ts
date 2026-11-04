import { isSideLength, SIDE_LENGTHS, type BestScores, type SideLength } from "../model.ts";

const PREFERENCES_KEY = "neon-pairs.preferences";
const BEST_SCORES_KEY = "neon-pairs.best-scores";

function readJson(key: string): unknown {
  try {
    if (typeof window === "undefined") return null;
    const text = window.localStorage.getItem(key);
    return text === null ? null : JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function readPreferredSize(): SideLength {
  const saved = readJson(PREFERENCES_KEY);
  if (typeof saved !== "object" || saved === null || Array.isArray(saved)) return 4;
  const size = (saved as Record<string, unknown>).gridSize;
  return isSideLength(size) ? size : 4;
}

export function savePreferredSize(size: SideLength): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ gridSize: size }));
  } catch {
    // Storage is optional; the in-memory game remains available.
  }
}

export function readBestScores(): BestScores {
  const saved = readJson(BEST_SCORES_KEY);
  if (typeof saved !== "object" || saved === null || Array.isArray(saved)) return {};
  const scores: Partial<Record<SideLength, number>> = {};
  const source = saved as Record<string, unknown>;
  for (const side of SIDE_LENGTHS) {
    const score = source[String(side)];
    if (typeof score === "number" && Number.isFinite(score) && Number.isInteger(score) && score >= 0 && score <= 999_999) {
      scores[side] = score;
    }
  }
  return scores;
}

export function saveBestScores(scores: BestScores): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(scores));
  } catch {
    // Storage is optional; the in-memory game remains available.
  }
}
