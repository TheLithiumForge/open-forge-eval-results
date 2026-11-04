import { isBoardSize, type BoardSize } from "../board-code.ts";
import { MOVE_LIMIT } from "../state.ts";

const PREFERENCES_KEY = "neon-pairs.preferences.v1";
const BEST_KEY = "neon-pairs.best.v1";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readPreferredSize(): BoardSize | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null");
    return record(value) && isBoardSize(value.gridSize) ? value.gridSize : null;
  } catch { return null; }
}

export function savePreferredSize(size: BoardSize): void {
  try { window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ gridSize: size })); } catch { /* Storage is optional. */ }
}

export function readBestScores(): Partial<Record<BoardSize, number>> {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(BEST_KEY) ?? "null");
    if (!record(value)) return {};
    const scores: Partial<Record<BoardSize, number>> = {};
    for (const [key, score] of Object.entries(value)) {
      const size = Number(key);
      if (isBoardSize(size) && typeof score === "number" && Number.isSafeInteger(score) && score >= 0 && score <= MOVE_LIMIT) {
        scores[size] = score;
      }
    }
    return scores;
  } catch { return {}; }
}

export function saveBestScore(size: BoardSize, moves: number): number | null {
  try {
    const scores = readBestScores();
    const current = scores[size];
    if (current !== undefined && current <= moves) return current;
    scores[size] = moves;
    window.localStorage.setItem(BEST_KEY, JSON.stringify(scores));
    return moves;
  } catch { return null; }
}
